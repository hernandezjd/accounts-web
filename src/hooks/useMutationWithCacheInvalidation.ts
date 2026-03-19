/**
 * Reusable mutation helper that handles cache invalidation consistently
 *
 * Pattern:
 * 1. Executes mutation via mutationFn
 * 2. On success: patches cache immediately, then schedules background refetch
 * 3. On error: clear any optimistic updates (we don't use them by default)
 *
 * This handles CQRS eventual consistency: cache patch provides immediate UX feedback,
 * background refetch ensures data consistency with server.
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';

interface UseCRUDMutationOptions<TData, TError, TVariables> extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  /** Query keys to invalidate/refetch on success */
  invalidateKeys?: (string | number | object)[][];
  /** Delay in ms before background refetch (default: 1000ms for CQRS consistency) */
  refetchDelay?: number;
  /** Custom cache patch function: receives response data, should return patched data or undefined */
  onSuccessPatch?: (data: TData) => TData | undefined;
}

export function useCRUDMutation<TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseCRUDMutationOptions<TData, TError, TVariables> = {}
) {
  const queryClient = useQueryClient();
  const {
    invalidateKeys = [],
    refetchDelay = 1000,
    onSuccessPatch,
    onSuccess,
    ...otherOptions
  } = options;

  // Create the wrapped mutation with cache invalidation logic
  const wrappedMutation = useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: async (data) => {
      // 1. Patch affected caches immediately with response data
      if (onSuccessPatch) {
        const patchedData = onSuccessPatch(data);
        if (patchedData) {
          // Update all related query caches with patched response
          invalidateKeys.forEach((key) => {
            queryClient.setQueryData(key, patchedData);
          });
        }
      }

      // 2. Schedule background refetch after delay for consistency verification
      // This handles CQRS eventual consistency: ensures UI matches server state
      if (invalidateKeys.length > 0) {
        setTimeout(() => {
          invalidateKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }, refetchDelay);
      }
    },
    ...otherOptions,
  });

  return wrappedMutation;
}

/**
 * Simplified mutation helper for operations that don't need cache patching
 * Just invalidates the specified keys on success
 */
export function useCRUDMutationSimple<TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: (string | number | object)[][] = [],
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: () => {
      // Invalidate all related caches after mutation succeeds
      if (invalidateKeys.length > 0) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
    ...options,
  });
}

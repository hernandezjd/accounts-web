/**
 * useApiMutation Hook Factory
 *
 * Drop-in replacement for useMutation with built-in error handling.
 * Automatically formats errors using formatError() so components
 * receive pre-formatted FormattedError in the error state.
 *
 * Usage:
 *   const mutation = useApiMutation(
 *     (body) => apiClient.command.POST('/accounts', { body }),
 *     {
 *       onSuccess: () => qc.invalidateQueries(...)
 *     }
 *   )
 *   // mutation.error is already FormattedError with requestId, userMessage, etc.
 */

import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'
import { formatError, type FormattedError } from '@/lib/error/useErrorHandler'
import type { ApiResponse } from '@/api/apiClient'

/**
 * Custom useMutation hook with built-in error formatting.
 * Wraps React Query's useMutation to automatically transform errors
 * into FormattedError format before they reach the component.
 *
 * @template TData - The successful response data type
 * @template TVariables - The variables passed to mutationFn
 * @template TError - Will always be FormattedError
 * @template TContext - Context type for onSuccess/onError callbacks
 *
 * @param mutationFn - Function that takes variables and returns ApiResponse<TData>
 * @param options - Additional React Query mutation options
 * @returns UseMutationResult with error always formatted as FormattedError
 *
 * @example
 *   const createAccount = useApiMutation(
 *     (body: CreateAccountRequest) =>
 *       apiClient.command.POST('/accounts', {
 *         body
 *       }),
 *     {
 *       onSuccess: () => qc.invalidateQueries(...)
 *     }
 *   )
 *   // createAccount.error is FormattedError when mutation fails
 */
export function useApiMutation<TData, TVariables, TContext = unknown>(
  mutationFn: (
    variables: TVariables
  ) => Promise<ApiResponse<TData> | { data?: TData; error?: any }>,
  options?: Omit<UseMutationOptions<TData, FormattedError, TVariables, TContext>, 'mutationFn'>
): UseMutationResult<TData, FormattedError, TVariables, TContext> {
  return useMutation({
    mutationFn: async (variables) => {
      const response = await mutationFn(variables)

      // Handle ApiResponse format from apiClient
      if ('error' in response && 'data' in response) {
        const apiResponse = response as ApiResponse<TData>

        if (apiResponse.error) {
          // Error is already formatted as FormattedError from apiClient
          throw apiResponse.error
        }

        return apiResponse.data as TData
      }

      // Handle legacy response format (should not happen with new apiClient)
      if ('error' in response && response.error) {
        throw formatError(response.error)
      }

      return response.data as TData
    },
    ...options,
  } as UseMutationOptions<TData, FormattedError, TVariables, TContext>)
}

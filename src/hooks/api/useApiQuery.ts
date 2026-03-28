/**
 * useApiQuery Hook Factory
 *
 * Drop-in replacement for useQuery with built-in error handling.
 * Automatically formats errors using formatError() so components
 * receive pre-formatted FormattedError in the error state.
 *
 * Usage:
 *   const { data, error } = useApiQuery(
 *     ['accounts', tenantId],
 *     () => apiClient.query.GET('/accounts', { ... })
 *   )
 *   // error is already FormattedError with requestId, userMessage, etc.
 */

import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query'
import { formatError, type FormattedError } from '@/lib/error/useErrorHandler'
import type { ApiResponse } from '@/api/apiClient'

/**
 * Custom useQuery hook with built-in error formatting.
 * Wraps React Query's useQuery to automatically transform errors
 * into FormattedError format before they reach the component.
 *
 * @template TData - The successful response data type
 * @template TError - Will always be FormattedError
 *
 * @param queryKey - React Query key array
 * @param queryFn - Function that returns ApiResponse<TData> from apiClient
 * @param options - Additional React Query options
 * @returns UseQueryResult with error always formatted as FormattedError
 *
 * @example
 *   const { data, error, isLoading } = useApiQuery(
 *     queryKeys.accounts.list(tenantId),
 *     () => apiClient.query.GET('/accounts', {
 *     })
 *   )
 */
export function useApiQuery<TData,>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<ApiResponse<TData> | { data?: TData; error?: any }>,
  options?: Omit<UseQueryOptions<TData, FormattedError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, FormattedError> {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await queryFn()

      // Handle ApiResponse format from apiClient.
      // Error responses have { error, response } with no 'data' key, so we check
      // for 'response' (the HTTP Response object) to identify all ApiResponse shapes.
      if ('response' in response) {
        const apiResponse = response as ApiResponse<TData>

        if (apiResponse.error) {
          // Already a FormattedError — throw as-is to preserve httpStatus,
          // requestUrl, responseBody populated by apiClient.
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
  } as UseQueryOptions<TData, FormattedError>)
}

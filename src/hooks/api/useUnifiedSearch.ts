import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/reporting-api'

export type UnifiedSearchResponse = components['schemas']['UnifiedSearchResponse']

export function useUnifiedSearch(
  tenantId: string | null | undefined,
  query: string,
  fromDate?: string,
  toDate?: string,
) {
  const queryParams: Record<string, string> = { q: query }
  if (fromDate) queryParams.fromDate = fromDate
  if (toDate) queryParams.toDate = toDate

  return useApiQuery<UnifiedSearchResponse>(
    [...queryKeys.search.all(), { tenantId, query, fromDate: fromDate ?? null, toDate: toDate ?? null }],
    () =>
      apiClient.query.GET('/reports/search', {
        params: {
          query: queryParams,
          header: { 'X-Tenant-Id': tenantId! },
        },
      }),
    { enabled: Boolean(tenantId) && query.trim().length >= 1 },
  )
}

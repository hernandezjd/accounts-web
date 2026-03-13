import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/reporting-api'

export type UnifiedSearchResponse = components['schemas']['UnifiedSearchResponse']

async function fetchUnifiedSearch(
  tenantId: string,
  query: string,
  fromDate?: string,
  toDate?: string,
): Promise<UnifiedSearchResponse> {
  const queryParams: Record<string, string> = { q: query }
  if (fromDate) queryParams.fromDate = fromDate
  if (toDate) queryParams.toDate = toDate

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/reports/search', {
    params: {
      query: queryParams,
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw error
  return data as UnifiedSearchResponse
}

export function useUnifiedSearch(
  tenantId: string | null | undefined,
  query: string,
  fromDate?: string,
  toDate?: string,
) {
  return useQuery({
    queryKey: [...queryKeys.search.all(), { tenantId, query, fromDate: fromDate ?? null, toDate: toDate ?? null }],
    queryFn: () => fetchUnifiedSearch(tenantId!, query, fromDate, toDate),
    enabled: Boolean(tenantId) && query.trim().length >= 1,
  })
}

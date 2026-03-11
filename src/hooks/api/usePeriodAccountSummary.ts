import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { PeriodAccountSummary } from '@/types/accounting'
import type { components } from '@/api/generated/reporting-api'

type ApiResponse = components['schemas']['PeriodAccountSummaryResponse']

async function fetchPeriodAccountSummary(
  tenantId: string,
  fromDate: string,
  toDate: string,
): Promise<PeriodAccountSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/reports/period-account-summary', {
    params: {
      query: { fromDate, toDate },
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw new Error('Failed to fetch period account summary')
  const resp = data as ApiResponse
  return {
    fromDate: resp.fromDate,
    toDate: resp.toDate,
    accounts: resp.accounts,
  }
}

export function usePeriodAccountSummary(
  tenantId: string | null | undefined,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: queryKeys.reports.periodAccountSummary(tenantId!, { fromDate, toDate }),
    queryFn: () => fetchPeriodAccountSummary(tenantId!, fromDate, toDate),
    enabled: Boolean(tenantId) && Boolean(fromDate) && Boolean(toDate),
  })
}

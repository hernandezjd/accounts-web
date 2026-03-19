import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/reporting-api'

export type PeriodReportResponse = components['schemas']['PeriodReportResponse']
export type PeriodReportWithClosureResponse = components['schemas']['PeriodReportWithClosureResponse']
export type PeriodReportEntry = components['schemas']['PeriodReportEntry']
export type PeriodReportEntryWithClosure = components['schemas']['PeriodReportEntryWithClosure']
export type PeriodTransactionEntry = components['schemas']['PeriodTransactionEntry']

async function fetchPeriodReport(
  tenantId: string,
  fromDate: string,
  toDate: string,
  level?: number,
  simulateClosure?: boolean,
): Promise<PeriodReportResponse | PeriodReportWithClosureResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/reports/period', {
    params: {
      query: {
        fromDate,
        toDate,
        ...(level !== undefined ? { level } : {}),
        ...(simulateClosure ? { simulateClosure } : {}),
      },
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw error
  return data as PeriodReportResponse | PeriodReportWithClosureResponse
}

export function usePeriodReport(
  tenantId: string | null | undefined,
  fromDate: string,
  toDate: string,
  level?: number,
  simulateClosure?: boolean,
  enabled = false,
) {
  return useQuery({
    queryKey: queryKeys.reports.periodReport(tenantId!, { fromDate, toDate, level, simulateClosure }),
    queryFn: () => fetchPeriodReport(tenantId!, fromDate, toDate, level, simulateClosure),
    enabled: Boolean(tenantId) && enabled,
  })
}

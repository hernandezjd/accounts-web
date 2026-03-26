import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/reporting-api'

export type PeriodReportResponse = components['schemas']['PeriodReportResponse']
export type PeriodReportWithClosureResponse = components['schemas']['PeriodReportWithClosureResponse']
export type PeriodReportEntry = components['schemas']['PeriodReportEntry']
export type PeriodReportEntryWithClosure = components['schemas']['PeriodReportEntryWithClosure']
export type PeriodTransactionEntry = components['schemas']['PeriodTransactionEntry']

export function usePeriodReport(
  tenantId: string | null | undefined,
  fromDate: string,
  toDate: string,
  level?: number,
  simulateClosure?: boolean,
  enabled = false,
) {
  const query: Record<string, string | number | boolean> = {
    fromDate,
    toDate,
  }
  if (level !== undefined) query.level = level
  if (simulateClosure) query.simulateClosure = simulateClosure

  return useApiQuery<PeriodReportResponse | PeriodReportWithClosureResponse>(
    queryKeys.reports.periodReport(tenantId!, { fromDate, toDate, level, simulateClosure }),
    () =>
      apiClient.query.GET('/reports/period', {
        params: {
          query,
          header: { 'X-Tenant-Id': tenantId! },
        },
      }),
    { enabled: Boolean(tenantId) && enabled },
  )
}

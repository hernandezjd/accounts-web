import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/reporting-api'

export type AccountBalanceResponse = components['schemas']['AccountBalanceResponse']
export type AccountBalanceWithClosureResponse = components['schemas']['AccountBalanceWithClosureResponse']

export function useBalanceAtLevel(
  tenantId: string | null | undefined,
  date: string,
  level: number | undefined,
  simulateClosure?: boolean,
  enabled = false,
) {
  const query: Record<string, string | number | boolean> = {
    date,
    level: level!,
  }
  if (simulateClosure) query.simulateClosure = simulateClosure

  return useApiQuery<(AccountBalanceResponse | AccountBalanceWithClosureResponse)[]>(
    queryKeys.reports.balanceAtLevel(tenantId!, level ?? 0, date, { simulateClosure }),
    () =>
      apiClient.query.GET('/reports/balance-at-level', {
        params: {
          query,
          header: { 'X-Tenant-Id': tenantId! },
        },
      }),
    { enabled: Boolean(tenantId) && level !== undefined && level >= 1 && enabled },
  )
}

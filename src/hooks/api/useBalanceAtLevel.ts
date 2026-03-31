import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/reporting-api'

export type AccountBalanceResponse = components['schemas']['AccountBalanceResponse']
export type AccountBalanceWithClosureResponse = components['schemas']['AccountBalanceWithClosureResponse']

export function useBalanceAtLevel(
  workspaceId: string | null | undefined,
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
    queryKeys.reports.balanceAtLevel(workspaceId!, level ?? 0, date, { simulateClosure }),
    () =>
      apiClient.query.GET('/reports/balance-at-level', {
        params: {
          query,
          header: { 'X-Workspace-Id': workspaceId! },
        },
      }),
    { enabled: Boolean(workspaceId) && level !== undefined && level >= 1 && enabled },
  )
}

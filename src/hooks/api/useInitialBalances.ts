import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/initial-balance-query-api'

export type InitialBalance = components['schemas']['InitialBalanceResponse']
export type InitialBalanceItem = components['schemas']['InitialBalanceItemResponse']

export function useInitialBalances(workspaceId: string | null | undefined) {
  return useApiQuery<InitialBalance[]>(
    queryKeys.initialBalances.list(workspaceId!),
    () =>
      apiClient.query.GET('/transactions/initial-balances', {
      }),
    { enabled: Boolean(workspaceId) },
  )
}

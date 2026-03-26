import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/initial-balance-query-api'

export type InitialBalance = components['schemas']['InitialBalanceResponse']
export type InitialBalanceItem = components['schemas']['InitialBalanceItemResponse']

export function useInitialBalances(tenantId: string | null | undefined) {
  return useApiQuery<InitialBalance[]>(
    queryKeys.initialBalances.list(tenantId!),
    () =>
      apiClient.query.GET('/transactions/initial-balances', {
        params: { header: { 'X-Tenant-Id': tenantId! } },
      }),
    { enabled: Boolean(tenantId) },
  )
}

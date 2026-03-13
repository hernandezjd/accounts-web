import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/initial-balance-query-api'

export type InitialBalance = components['schemas']['InitialBalanceResponse']
export type InitialBalanceItem = components['schemas']['InitialBalanceItemResponse']

async function fetchInitialBalances(tenantId: string): Promise<InitialBalance[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/transactions/initial-balances', {
    params: { header: { 'X-Tenant-Id': tenantId } },
  })
  if (error) throw error
  return data as InitialBalance[]
}

export function useInitialBalances(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.initialBalances.list(tenantId!),
    queryFn: () => fetchInitialBalances(tenantId!),
    enabled: Boolean(tenantId),
  })
}

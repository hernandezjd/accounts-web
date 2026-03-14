import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/reporting-api'

export type AccountBalanceResponse = components['schemas']['AccountBalanceResponse']
export type AccountBalanceWithClosureResponse = components['schemas']['AccountBalanceWithClosureResponse']

async function fetchBalanceAtLevel(
  tenantId: string,
  date: string,
  level: number,
  simulateClosure?: boolean,
): Promise<(AccountBalanceResponse | AccountBalanceWithClosureResponse)[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/reports/balance-at-level', {
    params: {
      query: {
        date,
        level,
        ...(simulateClosure ? { simulateClosure } : {}),
      },
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw error
  return data as (AccountBalanceResponse | AccountBalanceWithClosureResponse)[]
}

export function useBalanceAtLevel(
  tenantId: string | null | undefined,
  date: string,
  level: number | undefined,
  simulateClosure?: boolean,
  enabled = false,
) {
  return useQuery({
    queryKey: queryKeys.reports.balanceAtLevel(tenantId!, level ?? 0, date, { simulateClosure }),
    queryFn: () => fetchBalanceAtLevel(tenantId!, date, level!, simulateClosure),
    enabled: Boolean(tenantId) && level !== undefined && level >= 1 && enabled,
  })
}

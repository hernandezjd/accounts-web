import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import type { components } from '@/api/generated/reporting-api'

export type AccountBalanceResponse = components['schemas']['AccountBalanceResponse']

async function fetchBalanceAtLevel(
  tenantId: string,
  date: string,
  level: number,
): Promise<AccountBalanceResponse[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/reports/balance-at-level', {
    params: {
      query: { date, level },
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw new Error('Failed to fetch balance at level')
  return data as AccountBalanceResponse[]
}

export function useBalanceAtLevel(
  tenantId: string | null | undefined,
  date: string,
  level: number | undefined,
  enabled = false,
) {
  return useQuery({
    queryKey: ['balanceAtLevel', tenantId, date, level],
    queryFn: () => fetchBalanceAtLevel(tenantId!, date, level!),
    enabled: Boolean(tenantId) && level !== undefined && level >= 1 && enabled,
  })
}

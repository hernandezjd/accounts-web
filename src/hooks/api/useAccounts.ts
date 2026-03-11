import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/account-query-api'

export type Account = components['schemas']['Account']

async function fetchAccounts(tenantId: string, includeInactive: boolean): Promise<Account[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/accounts', {
    params: {
      header: { 'X-Tenant-Id': tenantId },
      query: includeInactive ? { includeInactive: true } : undefined,
    },
  })
  if (error) throw new Error('Failed to fetch accounts')
  return data as Account[]
}

export function useAccounts(tenantId: string | null | undefined, includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.accounts.list(tenantId!, includeInactive),
    queryFn: () => fetchAccounts(tenantId!, includeInactive),
    enabled: Boolean(tenantId),
  })
}

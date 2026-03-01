import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import type { components } from '@/api/generated/account-query-api'

export type Account = components['schemas']['Account']

async function fetchAccounts(tenantId: string): Promise<Account[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/accounts', {
    params: {
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw new Error('Failed to fetch accounts')
  return data as Account[]
}

export function useAccounts(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['accounts', tenantId],
    queryFn: () => fetchAccounts(tenantId!),
    enabled: Boolean(tenantId),
  })
}

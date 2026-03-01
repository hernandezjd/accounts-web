import { useQuery } from '@tanstack/react-query'
import { tenantClient } from '@/api/clients'
import type { Tenant } from '@/types'

async function fetchTenants(): Promise<Tenant[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (tenantClient as any).GET('/tenants')
  if (error) throw new Error('Failed to fetch tenants')
  return (data ?? []) as Tenant[]
}

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
  })
}

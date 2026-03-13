import { useQuery } from '@tanstack/react-query'
import { tenantClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { Tenant } from '@/types'

async function fetchTenant(id: string): Promise<Tenant> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (tenantClient as any).GET('/tenants/{id}', {
    params: { path: { id } },
  })
  if (error) throw error
  return data as Tenant
}

export function useTenant(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tenants.detail(id!),
    queryFn: () => fetchTenant(id!),
    enabled: Boolean(id),
  })
}

import { useQuery } from '@tanstack/react-query'
import { tenantClient } from '@/api/clients'
import type { Tenant } from '@/types'

async function fetchTenant(id: string): Promise<Tenant> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (tenantClient as any).GET('/tenants/{id}', {
    params: { path: { id } },
  })
  if (error) throw new Error(`Failed to fetch tenant ${id}`)
  return data as Tenant
}

export function useTenant(id: string | null | undefined) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => fetchTenant(id!),
    enabled: Boolean(id),
  })
}

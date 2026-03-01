import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import type { components } from '@/api/generated/config-query-api'

export type TenantConfig = components['schemas']['TenantConfigResponse']

async function fetchTenantConfig(tenantId: string): Promise<TenantConfig> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/config', {
    params: {
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw new Error('Failed to fetch tenant config')
  return data as TenantConfig
}

export function useTenantConfig(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['tenantConfig', tenantId],
    queryFn: () => fetchTenantConfig(tenantId!),
    enabled: Boolean(tenantId),
  })
}

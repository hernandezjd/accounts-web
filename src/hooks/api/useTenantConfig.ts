import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/config-query-api'

export type TenantConfig = components['schemas']['TenantConfigResponse']

async function fetchTenantConfig(tenantId: string): Promise<TenantConfig> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/config', {
    params: {
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw error
  return data as TenantConfig
}

export function useTenantConfig(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tenantConfig.detail(tenantId!),
    queryFn: () => fetchTenantConfig(tenantId!),
    enabled: Boolean(tenantId),
  })
}

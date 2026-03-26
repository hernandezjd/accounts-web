import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/config-query-api'

export type TenantConfig = components['schemas']['TenantConfigResponse']

export function useTenantConfig(tenantId: string | null | undefined) {
  return useApiQuery<TenantConfig>(
    queryKeys.tenantConfig.detail(tenantId!),
    () =>
      apiClient.query.GET('/config', {
        params: {
          header: { 'X-Tenant-Id': tenantId! },
        },
      }),
    { enabled: Boolean(tenantId) },
  )
}

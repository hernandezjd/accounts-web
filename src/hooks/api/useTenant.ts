import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { Tenant } from '@/types'

export function useTenant(id: string | null | undefined) {
  return useApiQuery<Tenant>(
    queryKeys.tenants.detail(id!),
    () => apiClient.tenant.GET('/tenants/{id}', { params: { path: { id: id! } } }),
    { enabled: Boolean(id) }
  )
}

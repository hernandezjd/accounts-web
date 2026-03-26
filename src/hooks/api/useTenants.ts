import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { Tenant } from '@/types'

export function useTenants() {
  return useApiQuery<Tenant[]>(
    queryKeys.tenants.list(),
    () => apiClient.tenant.GET('/tenants')
  )
}

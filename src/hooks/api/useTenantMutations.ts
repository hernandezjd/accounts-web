import { useApiMutation } from '@/hooks/api/useApiMutation'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/tenant-api'

type CreateTenantRequest = components['schemas']['CreateTenantRequest']
type UpdateTenantRequest = components['schemas']['UpdateTenantRequest']
type Tenant = components['schemas']['Tenant']

export function useTenantMutations() {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.tenants.all() })
  }

  const createTenant = useApiMutation<Tenant, CreateTenantRequest>(
    (body: CreateTenantRequest) => apiClient.tenant.POST('/tenants', { body }),
    { onSuccess: invalidate }
  )

  const updateTenant = useApiMutation(
    ({ id, body }: { id: string; body: UpdateTenantRequest }) =>
      apiClient.tenant.PUT('/tenants/{id}', {
        params: { path: { id } },
        body,
      }),
    { onSuccess: invalidate }
  )

  const deactivateTenant = useApiMutation(
    (id: string) =>
      apiClient.tenant.POST('/tenants/{id}/deactivate', {
        params: { path: { id } },
      }),
    { onSuccess: invalidate }
  )

  const reactivateTenant = useApiMutation(
    (id: string) =>
      apiClient.tenant.POST('/tenants/{id}/reactivate', {
        params: { path: { id } },
      }),
    { onSuccess: invalidate }
  )

  const deleteTenant = useApiMutation(
    (id: string) =>
      apiClient.tenant.DELETE('/tenants/{id}', {
        params: { path: { id } },
      }),
    { onSuccess: invalidate }
  )

  return { createTenant, updateTenant, deactivateTenant, reactivateTenant, deleteTenant }
}

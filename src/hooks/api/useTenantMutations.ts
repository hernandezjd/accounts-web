import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantClient } from '@/api/clients'
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

  const createTenant = useMutation({
    mutationFn: async (body: CreateTenantRequest): Promise<Tenant> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (tenantClient as any).POST('/tenants', { body })
      if (error) throw error
      return data as Tenant
    },
    onSuccess: invalidate,
  })

  const updateTenant = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateTenantRequest }): Promise<Tenant> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (tenantClient as any).PUT('/tenants/{id}', {
        params: { path: { id } },
        body,
      })
      if (error) throw error
      return data as Tenant
    },
    onSuccess: invalidate,
  })

  const deactivateTenant = useMutation({
    mutationFn: async (id: string): Promise<Tenant> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (tenantClient as any).POST('/tenants/{id}/deactivate', {
        params: { path: { id } },
      })
      if (error) throw error
      return data as Tenant
    },
    onSuccess: invalidate,
  })

  const reactivateTenant = useMutation({
    mutationFn: async (id: string): Promise<Tenant> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (tenantClient as any).POST('/tenants/{id}/reactivate', {
        params: { path: { id } },
      })
      if (error) throw error
      return data as Tenant
    },
    onSuccess: invalidate,
  })

  const deleteTenant = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (tenantClient as any).DELETE('/tenants/{id}', {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { createTenant, updateTenant, deactivateTenant, reactivateTenant, deleteTenant }
}

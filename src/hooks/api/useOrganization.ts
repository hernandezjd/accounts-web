import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { Organization } from './useOrganizations'

export function useOrganization(id: string | null | undefined) {
  return useApiQuery<Organization>(
    queryKeys.organizations.detail(id!),
    () => apiClient.organization.GET('/organizations/{id}', { params: { path: { id: id! } } }),
    { enabled: Boolean(id) },
  )
}

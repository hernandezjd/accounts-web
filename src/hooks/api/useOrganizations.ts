import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/organization-api'

export type Organization = components['schemas']['OrganizationResponse']

export function useOrganizations() {
  return useApiQuery<Organization[]>(
    queryKeys.organizations.list(),
    () => apiClient.organization.GET('/organizations'),
  )
}

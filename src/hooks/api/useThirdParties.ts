import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/third-party-query-api'

export type ThirdParty = components['schemas']['ThirdParty']

export function useThirdParties(tenantId: string | null | undefined, name: string) {
  return useApiQuery<ThirdParty[]>(
    queryKeys.thirdParties.list(tenantId!, name),
    () =>
      apiClient.query.GET('/third-parties', {
        params: {
          query: { name },
          header: { 'X-Tenant-Id': tenantId! },
        },
      }),
    { enabled: Boolean(tenantId) && name.trim().length >= 1 },
  )
}

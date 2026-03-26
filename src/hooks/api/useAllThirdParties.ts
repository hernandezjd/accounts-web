import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/third-party-query-api'

export type ThirdParty = components['schemas']['ThirdParty']

export function useAllThirdParties() {
  return useApiQuery<ThirdParty[]>(
    queryKeys.thirdParties.allGlobal(),
    () => apiClient.query.GET('/third-parties', { params: { query: {} } })
  )
}

import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/third-party-query-api'

export type ThirdParty = components['schemas']['ThirdParty']

export function useThirdParties(workspaceId: string | null | undefined, name: string) {
  return useApiQuery<ThirdParty[]>(
    queryKeys.thirdParties.list(workspaceId!, name),
    () =>
      apiClient.query.GET('/third-parties', {
        params: {
          query: { name },
          header: { 'X-Workspace-Id': workspaceId! },
        },
      }),
    { enabled: Boolean(workspaceId) && name.trim().length >= 1 },
  )
}

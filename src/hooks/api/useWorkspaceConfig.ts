import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/config-query-api'

export type WorkspaceConfig = components['schemas']['WorkspaceConfigResponse']

export function useWorkspaceConfig(workspaceId: string | null | undefined) {
  return useApiQuery<WorkspaceConfig>(
    queryKeys.workspaceConfig.detail(workspaceId!),
    () =>
      apiClient.query.GET('/config', {
        params: {
          header: { 'X-Workspace-Id': workspaceId! },
        },
      }),
    { enabled: Boolean(workspaceId) },
  )
}

import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/account-command-api'

export type CodeStructureConfig = components['schemas']['CodeStructureConfigResponse']

export function useCodeStructureConfig(workspaceId: string | null | undefined) {
  return useApiQuery<CodeStructureConfig>(
    queryKeys.codeStructureConfig.detail(workspaceId!),
    () =>
      apiClient.command.GET('/workspaces/{workspaceId}/code-structure-config', {
        params: { path: { workspaceId: workspaceId! } },
      }),
    { enabled: Boolean(workspaceId) },
  )
}

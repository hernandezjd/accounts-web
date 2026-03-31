import { useQueryClient } from '@tanstack/react-query'
import { useApiMutation } from '@/hooks/api/useApiMutation'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/account-command-api'

type CodeStructureConfigRequest = components['schemas']['CodeStructureConfigRequest']

export function useCodeStructureConfigMutations(workspaceId: string) {
  const qc = useQueryClient()

  const configureCodeStructure = useApiMutation(
    (body: CodeStructureConfigRequest) =>
      apiClient.command.PUT('/workspaces/{workspaceId}/code-structure-config', {
        params: { path: { workspaceId } },
        body,
      }),
    {
      onSuccess: () => {
        // Code structure config change affects account validation
        qc.invalidateQueries({ queryKey: queryKeys.codeStructureConfig.all() })
        qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
      },
    },
  )

  return { configureCodeStructure }
}

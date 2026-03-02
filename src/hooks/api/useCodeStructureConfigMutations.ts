import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components } from '@/api/generated/account-command-api'

type CodeStructureConfigRequest = components['schemas']['CodeStructureConfigRequest']
type CodeStructureConfigResponse = components['schemas']['CodeStructureConfigResponse']

export function useCodeStructureConfigMutations(tenantId: string) {
  const qc = useQueryClient()

  const configureCodeStructure = useMutation({
    mutationFn: async (body: CodeStructureConfigRequest): Promise<CodeStructureConfigResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT(
        '/tenants/{tenantId}/code-structure-config',
        {
          params: { path: { tenantId } },
          body,
        },
      )
      if (error)
        throw new Error((error as { error?: string }).error ?? 'Failed to configure code structure')
      return data as CodeStructureConfigResponse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codeStructureConfig', tenantId] })
    },
  })

  return { configureCodeStructure }
}

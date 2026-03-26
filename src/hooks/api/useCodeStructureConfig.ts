import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/account-command-api'

export type CodeStructureConfig = components['schemas']['CodeStructureConfigResponse']

export function useCodeStructureConfig(tenantId: string | null | undefined) {
  return useApiQuery<CodeStructureConfig>(
    queryKeys.codeStructureConfig.detail(tenantId!),
    () =>
      apiClient.command.GET('/tenants/{tenantId}/code-structure-config', {
        params: { path: { tenantId: tenantId! } },
      }),
    { enabled: Boolean(tenantId) },
  )
}

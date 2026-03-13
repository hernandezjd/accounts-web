import { useQuery } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/account-command-api'

export type CodeStructureConfig = components['schemas']['CodeStructureConfigResponse']

async function fetchCodeStructureConfig(tenantId: string): Promise<CodeStructureConfig> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (commandClient as any).GET('/tenants/{tenantId}/code-structure-config', {
    params: { path: { tenantId } },
  })
  if (error) throw error
  return data as CodeStructureConfig
}

export function useCodeStructureConfig(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.codeStructureConfig.detail(tenantId!),
    queryFn: () => fetchCodeStructureConfig(tenantId!),
    enabled: Boolean(tenantId),
  })
}

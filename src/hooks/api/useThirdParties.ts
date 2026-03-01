import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import type { components } from '@/api/generated/third-party-query-api'

export type ThirdParty = components['schemas']['ThirdParty']

async function fetchThirdParties(tenantId: string, name: string): Promise<ThirdParty[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/third-parties', {
    params: {
      query: { name },
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw new Error('Failed to fetch third parties')
  return data as ThirdParty[]
}

export function useThirdParties(tenantId: string | null | undefined, name: string) {
  return useQuery({
    queryKey: ['thirdParties', tenantId, name],
    queryFn: () => fetchThirdParties(tenantId!, name),
    enabled: Boolean(tenantId) && name.trim().length >= 1,
  })
}

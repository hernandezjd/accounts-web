import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/third-party-query-api'

export type ThirdParty = components['schemas']['ThirdParty']

async function fetchAllThirdParties(): Promise<ThirdParty[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/third-parties', {
    params: { query: {} },
  })
  if (error) throw new Error('Failed to fetch third parties')
  return data as ThirdParty[]
}

export function useAllThirdParties() {
  return useQuery({
    queryKey: queryKeys.thirdParties.allGlobal(),
    queryFn: fetchAllThirdParties,
  })
}

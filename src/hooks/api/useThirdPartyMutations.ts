import { useMutation } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components } from '@/api/generated/third-party-command-api'

type CreateThirdPartyRequest = components['schemas']['CreateThirdPartyRequest']
type ThirdPartyCommandResponse = components['schemas']['ThirdPartyCommandResponse']

export function useThirdPartyMutations() {
  const createThirdParty = useMutation({
    mutationFn: async (body: CreateThirdPartyRequest): Promise<ThirdPartyCommandResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST('/third-parties', {
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to create third party')
      return data as ThirdPartyCommandResponse
    },
  })

  return { createThirdParty }
}

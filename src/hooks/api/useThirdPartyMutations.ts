import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components } from '@/api/generated/third-party-command-api'

type CreateThirdPartyRequest = components['schemas']['CreateThirdPartyRequest']
type UpdateThirdPartyRequest = components['schemas']['UpdateThirdPartyRequest']
type ThirdPartyCommandResponse = components['schemas']['ThirdPartyCommandResponse']

export function useThirdPartyMutations() {
  const qc = useQueryClient()

  const invalidate = () => qc.invalidateQueries({ queryKey: ['allThirdParties'] })

  const createThirdParty = useMutation({
    mutationFn: async (body: CreateThirdPartyRequest): Promise<ThirdPartyCommandResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST('/third-parties', {
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to create third party')
      return data as ThirdPartyCommandResponse
    },
    onSuccess: invalidate,
  })

  const updateThirdParty = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: UpdateThirdPartyRequest
    }): Promise<ThirdPartyCommandResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/third-parties/{id}', {
        params: { path: { id } },
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to update third party')
      return data as ThirdPartyCommandResponse
    },
    onSuccess: invalidate,
  })

  const deactivateThirdParty = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).POST('/third-parties/{id}/deactivate', {
        params: { path: { id } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to deactivate third party')
    },
    onSuccess: invalidate,
  })

  const activateThirdParty = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).POST('/third-parties/{id}/activate', {
        params: { path: { id } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to activate third party')
    },
    onSuccess: invalidate,
  })

  return { createThirdParty, updateThirdParty, deactivateThirdParty, activateThirdParty }
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/third-party-command-api'

type CreateThirdPartyRequest = components['schemas']['CreateThirdPartyRequest']
type UpdateThirdPartyRequest = components['schemas']['UpdateThirdPartyRequest']
type ThirdPartyCommandResponse = components['schemas']['ThirdPartyCommandResponse']

export function useThirdPartyMutations() {
  const qc = useQueryClient()

  /**
   * Invalidate all third-party related queries and force immediate refetch.
   * Third-party mutations affect: third-party lists and transaction forms that reference third-parties.
   */
  const invalidateThirdPartyQueries = async () => {
    // Invalidate both global and tenant-scoped variants
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.thirdParties.all() }),
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
    ])
    // Force immediate refetch of active third-party queries
    await qc.refetchQueries({
      predicate: (query) => {
        const key = query.queryKey
        return Array.isArray(key) && key[0] === 'third-parties'
      },
      type: 'active',
    })
  }

  const createThirdParty = useMutation({
    mutationFn: async (body: CreateThirdPartyRequest): Promise<ThirdPartyCommandResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST('/third-parties', {
        body,
      })
      if (error) throw error
      return data as ThirdPartyCommandResponse
    },
    onSuccess: async () => {
      await invalidateThirdPartyQueries()
    },
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
      if (error) throw error
      return data as ThirdPartyCommandResponse
    },
    onSuccess: async () => {
      await invalidateThirdPartyQueries()
    },
  })

  const deactivateThirdParty = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).POST('/third-parties/{id}/deactivate', {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidateThirdPartyQueries()
    },
  })

  const activateThirdParty = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).POST('/third-parties/{id}/activate', {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidateThirdPartyQueries()
    },
  })

  return { createThirdParty, updateThirdParty, deactivateThirdParty, activateThirdParty }
}

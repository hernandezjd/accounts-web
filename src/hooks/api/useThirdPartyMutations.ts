import { useQueryClient } from '@tanstack/react-query'
import { useApiMutation } from '@/hooks/api/useApiMutation'
import { apiClient } from '@/api/apiClient'
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
    // Invalidate both global and workspace-scoped variants
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

  const createThirdParty = useApiMutation<ThirdPartyCommandResponse, CreateThirdPartyRequest>(
    (body: CreateThirdPartyRequest) =>
      apiClient.command.POST('/third-parties', {
        body,
      }),
    {
      onSuccess: async () => {
        await invalidateThirdPartyQueries()
      },
    },
  )

  const updateThirdParty = useApiMutation(
    ({ id, body }: { id: string; body: UpdateThirdPartyRequest }) =>
      apiClient.command.PUT('/third-parties/{id}', {
        params: { path: { id } },
        body,
      }),
    {
      onSuccess: async () => {
        await invalidateThirdPartyQueries()
      },
    },
  )

  const deactivateThirdParty = useApiMutation(
    (id: string) =>
      apiClient.command.POST('/third-parties/{id}/deactivate', {
        params: { path: { id } },
      }),
    {
      onSuccess: async () => {
        await invalidateThirdPartyQueries()
      },
    },
  )

  const activateThirdParty = useApiMutation(
    (id: string) =>
      apiClient.command.POST('/third-parties/{id}/activate', {
        params: { path: { id } },
      }),
    {
      onSuccess: async () => {
        await invalidateThirdPartyQueries()
      },
    },
  )

  return { createThirdParty, updateThirdParty, deactivateThirdParty, activateThirdParty }
}

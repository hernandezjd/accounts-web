import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { useApiMutation } from './useApiMutation'
import type { components } from '@/api/generated/account-command-api'
import type { Account } from '@/hooks/api/useAccounts'

type CreateAccountRequest = components['schemas']['CreateAccountRequest']
type UpdateAccountRequest = components['schemas']['UpdateAccountRequest']
type ToggleHasThirdPartiesRequest = { enabled: boolean; thirdPartyId?: string }
type AccountCommandResponse = components['schemas']['AccountCommandResponse']

export function useAccountMutations(workspaceId: string) {
  const qc = useQueryClient()

  /**
   * Force refetch of all account list queries (with any filters)
   */
  const refetchAccountQueries = async () => {
    await qc.refetchQueries({
      predicate: (query) => {
        const key = query.queryKey
        return Array.isArray(key) && key[0] === 'accounts' && key[1] === 'list'
      },
      type: 'active',
    })
  }

  const createAccount = useApiMutation(
    (body: CreateAccountRequest) =>
      apiClient.command.POST<AccountCommandResponse>('/accounts', {
        body,
      }),
    {
      onSuccess: (data, variables) => {
        // Optimistically add the new account to the cache so it appears immediately,
        // before the event processor has had time to project it to the read side.
        const cachedAccounts =
          qc.getQueryData<Account[]>(queryKeys.accounts.list(workspaceId, true)) ??
          qc.getQueryData<Account[]>(queryKeys.accounts.list(workspaceId, false)) ??
          []
        const parent = variables.parentId
          ? cachedAccounts.find((a) => a.id === variables.parentId)
          : undefined
        const newAccount: Account = {
          id: data.accountId,
          code: data.code ?? variables.code,
          name: data.name ?? variables.name,
          hasThirdParties: variables.hasThirdParties ?? false,
          parentId: variables.parentId ?? undefined,
          level: parent?.level != null ? parent.level + 1 : 1,
          active: true,
        }
        // Update both includeInactive variants if they exist
        for (const includeInactive of [true, false]) {
          const key = queryKeys.accounts.list(workspaceId, includeInactive)
          const existing = qc.getQueryData<Account[]>(key)
          if (existing !== undefined) {
            qc.setQueryData(key, [...existing, newAccount])
          }
        }
        // Delay the authoritative refetch to avoid a race where the query service
        // hasn't yet projected the event, which would overwrite the optimistic data.
        setTimeout(async () => {
          await qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
          await refetchAccountQueries()
        }, 500)
      },
    }
  )

  const updateAccount = useApiMutation(
    ({ id, body }: { id: string; body: UpdateAccountRequest }) =>
      apiClient.command.PUT<AccountCommandResponse>('/accounts/{id}', {
        params: { path: { id } },
        body,
      }),
    {
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
        await refetchAccountQueries()
      },
    }
  )

  const deactivateAccount = useApiMutation(
    (id: string) =>
      apiClient.command.POST('/accounts/{id}/deactivate', {
        params: { path: { id } },
      }),
    {
      onSuccess: async () => {
        // Deactivation affects accounts, third-parties, and reports
        await Promise.all([
          qc.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
          qc.invalidateQueries({ queryKey: queryKeys.thirdParties.all() }),
        ])
        await refetchAccountQueries()
      },
    }
  )

  const activateAccount = useApiMutation(
    (id: string) =>
      apiClient.command.POST('/accounts/{id}/activate', {
        params: { path: { id } },
      }),
    {
      onSuccess: async () => {
        // Activation affects accounts, third-parties, and reports
        await Promise.all([
          qc.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
          qc.invalidateQueries({ queryKey: queryKeys.thirdParties.all() }),
        ])
        await refetchAccountQueries()
      },
    }
  )

  const toggleHasThirdParties = useApiMutation(
    ({ accountId, body }: { accountId: string; body: ToggleHasThirdPartiesRequest }) =>
      apiClient.command.PUT('/accounts/{accountId}/has-third-parties', {
        params: { path: { accountId } },
        body,
      }),
    {
      onSuccess: async () => {
        // Toggle affects accounts and third-parties
        await Promise.all([
          qc.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
          qc.invalidateQueries({ queryKey: queryKeys.thirdParties.all() }),
        ])
        await refetchAccountQueries()
      },
    }
  )

  return { createAccount, updateAccount, deactivateAccount, activateAccount, toggleHasThirdParties }
}

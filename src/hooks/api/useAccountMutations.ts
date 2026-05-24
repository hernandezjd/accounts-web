import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { pollUntilFound } from '@/api/polling'
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
      onSuccess: async (data, variables) => {
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
        // Poll the query service directly until the new account appears in the read model.
        // Checking the local cache wouldn't work: the optimistic update above has already
        // inserted the account into the cache, so a cache-based predicate returns true
        // immediately and the subsequent refetch would race the projection and overwrite
        // the optimistic data with a stale list that excludes the new account.
        await pollUntilFound(
          async () => {
            const response = await apiClient.query.GET<Account[]>('/accounts', {
              params: {
                header: { 'X-Workspace-Id': workspaceId },
                query: { includeInactive: true },
              },
            })
            return response.data?.some((a) => a.id === newAccount.id) ?? false
          },
          { initialDelayMs: 50, maxTimeoutMs: 10000 }
        )
        // Projection is now consistent (or we timed out); safe to invalidate and refetch.
        await qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
        await refetchAccountQueries()
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
      onSuccess: async (_data, variables) => {
        const accountId = variables.id
        const newCode = variables.body.code
        const newName = variables.body.name
        const newParentId = (variables.body as UpdateAccountRequest & { parentId?: string | null }).parentId
        // Optimistically patch the existing entry in both includeInactive variants
        // so the UI reflects the change immediately, before the projection catches up.
        for (const includeInactive of [true, false]) {
          const key = queryKeys.accounts.list(workspaceId, includeInactive)
          const existing = qc.getQueryData<Account[]>(key)
          if (existing === undefined) continue
          const parent = newParentId
            ? existing.find((a) => a.id === newParentId)
            : undefined
          const nextLevel = newParentId
            ? (parent?.level != null ? parent.level + 1 : undefined)
            : 1
          qc.setQueryData<Account[]>(
            key,
            existing.map((a) =>
              a.id === accountId
                ? {
                    ...a,
                    code: newCode ?? a.code,
                    name: newName ?? a.name,
                    parentId: newParentId ?? undefined,
                    level: nextLevel ?? a.level,
                  }
                : a,
            ),
          )
        }
        // Poll the query service directly until the read model reflects the update.
        // A cache-based predicate would return true immediately because of the optimistic
        // patch above, which would race the projection and let the subsequent refetch
        // overwrite the cache with stale (pre-update) data. Same reasoning as createAccount.
        await pollUntilFound(
          async () => {
            const response = await apiClient.query.GET<Account[]>('/accounts', {
              params: {
                header: { 'X-Workspace-Id': workspaceId },
                query: { includeInactive: true },
              },
            })
            const updated = response.data?.find((a) => a.id === accountId)
            if (!updated) return false
            return (
              (newCode === undefined || updated.code === newCode) &&
              (newName === undefined || updated.name === newName)
            )
          },
          { initialDelayMs: 50, maxTimeoutMs: 10000 }
        )
        // Projection is now consistent (or we timed out); safe to invalidate and refetch.
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

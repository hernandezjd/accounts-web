import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/account-command-api'
import type { Account } from '@/hooks/api/useAccounts'

type CreateAccountRequest = components['schemas']['CreateAccountRequest']
type UpdateAccountRequest = components['schemas']['UpdateAccountRequest']
type ToggleHasThirdPartiesRequest = { enabled: boolean; thirdPartyId?: string }
type AccountCommandResponse = components['schemas']['AccountCommandResponse']

export function useAccountMutations(tenantId: string) {
  const qc = useQueryClient()

  const createAccount = useMutation({
    mutationFn: async (body: CreateAccountRequest): Promise<AccountCommandResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST('/accounts', {
        params: { header: { 'X-Tenant-Id': tenantId } },
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to create account')
      return data as AccountCommandResponse
    },
    onSuccess: (data, variables) => {
      // Optimistically add the new account to the cache so it appears immediately,
      // before the event processor has had time to project it to the read side.
      const cachedAccounts =
        qc.getQueryData<Account[]>(queryKeys.accounts.list(tenantId, true)) ??
        qc.getQueryData<Account[]>(queryKeys.accounts.list(tenantId, false)) ??
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
        const key = queryKeys.accounts.list(tenantId, includeInactive)
        const existing = qc.getQueryData<Account[]>(key)
        if (existing !== undefined) {
          qc.setQueryData(key, [...existing, newAccount])
        }
      }
      // Delay the authoritative refetch to avoid a race where the query service
      // hasn't yet projected the event, which would overwrite the optimistic data.
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
      }, 500)
    },
  })

  const updateAccount = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: UpdateAccountRequest
    }): Promise<AccountCommandResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/accounts/{id}', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to update account')
      return data as AccountCommandResponse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
    },
  })

  const deactivateAccount = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).POST('/accounts/{id}/deactivate', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to deactivate account')
    },
    onSuccess: () => {
      // Deactivation affects accounts, third-parties, and reports
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
      qc.invalidateQueries({ queryKey: queryKeys.thirdParties.all() })
    },
  })

  const activateAccount = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).POST('/accounts/{id}/activate', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to activate account')
    },
    onSuccess: () => {
      // Activation affects accounts, third-parties, and reports
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
      qc.invalidateQueries({ queryKey: queryKeys.thirdParties.all() })
    },
  })

  const toggleHasThirdParties = useMutation({
    mutationFn: async ({
      accountId,
      body,
    }: {
      accountId: string
      body: ToggleHasThirdPartiesRequest
    }): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).PUT('/accounts/{accountId}/has-third-parties', {
        params: { path: { accountId }, header: { 'X-Tenant-Id': tenantId } },
        body,
      })
      if (error)
        throw new Error(
          (error as { error?: string }).error ?? 'Failed to toggle has-third-parties',
        )
    },
    onSuccess: () => {
      // Toggle affects accounts and third-parties
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
      qc.invalidateQueries({ queryKey: queryKeys.thirdParties.all() })
    },
  })

  return { createAccount, updateAccount, deactivateAccount, activateAccount, toggleHasThirdParties }
}

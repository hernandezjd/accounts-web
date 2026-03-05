import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components } from '@/api/generated/account-command-api'

type CreateAccountRequest = components['schemas']['CreateAccountRequest']
type UpdateAccountRequest = components['schemas']['UpdateAccountRequest']
type ToggleHasThirdPartiesRequest = { enabled: boolean; thirdPartyId?: string }
type AccountCommandResponse = components['schemas']['AccountCommandResponse']

export function useAccountMutations(tenantId: string) {
  const qc = useQueryClient()

  const invalidate = () => qc.invalidateQueries({ queryKey: ['accounts', tenantId] })

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
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  })

  const deactivateAccount = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).POST('/accounts/{id}/deactivate', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to deactivate account')
    },
    onSuccess: invalidate,
  })

  const activateAccount = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).POST('/accounts/{id}/activate', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to activate account')
    },
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  })

  return { createAccount, updateAccount, deactivateAccount, activateAccount, toggleHasThirdParties }
}

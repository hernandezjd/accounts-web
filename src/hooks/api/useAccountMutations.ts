import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components } from '@/api/generated/account-command-api'

type CreateAccountRequest = components['schemas']['CreateAccountRequest']
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts', tenantId] })
    },
  })

  return { createAccount }
}

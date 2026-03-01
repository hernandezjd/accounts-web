import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components } from '@/api/generated/transaction-type-command-api'

type CreateTransactionTypeRequest = components['schemas']['CreateTransactionTypeRequest']
type UpdateTransactionTypeRequest = components['schemas']['UpdateTransactionTypeRequest']
type TransactionTypeCommandResponse = components['schemas']['TransactionTypeCommandResponse']

export function useTransactionTypeMutations() {
  const qc = useQueryClient()

  const invalidate = () => qc.invalidateQueries({ queryKey: ['transactionTypes'] })

  const createTransactionType = useMutation({
    mutationFn: async (body: CreateTransactionTypeRequest): Promise<TransactionTypeCommandResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST('/transaction-types', {
        body,
      })
      if (error)
        throw new Error((error as { error?: string }).error ?? 'Failed to create transaction type')
      return data as TransactionTypeCommandResponse
    },
    onSuccess: invalidate,
  })

  const updateTransactionType = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: UpdateTransactionTypeRequest
    }): Promise<TransactionTypeCommandResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/transaction-types/{id}', {
        params: { path: { id } },
        body,
      })
      if (error)
        throw new Error((error as { error?: string }).error ?? 'Failed to update transaction type')
      return data as TransactionTypeCommandResponse
    },
    onSuccess: invalidate,
  })

  const deleteTransactionType = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).DELETE('/transaction-types/{id}', {
        params: { path: { id } },
      })
      if (error)
        throw new Error((error as { error?: string }).error ?? 'Failed to delete transaction type')
    },
    onSuccess: invalidate,
  })

  return { createTransactionType, updateTransactionType, deleteTransactionType }
}

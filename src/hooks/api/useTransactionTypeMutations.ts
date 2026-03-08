import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components } from '@/api/generated/transaction-type-command-api'
import type { TransactionType } from '@/hooks/api/useTransactionTypes'

type CreateTransactionTypeRequest = components['schemas']['CreateTransactionTypeRequest']
type UpdateTransactionTypeRequest = components['schemas']['UpdateTransactionTypeRequest']
type TransactionTypeCommandResponse = components['schemas']['TransactionTypeCommandResponse']

export function useTransactionTypeMutations() {
  const qc = useQueryClient()

  const queryKey = ['transactionTypes']

  const cancelAndDelayInvalidate = async () => {
    await qc.cancelQueries({ queryKey })
    setTimeout(() => qc.invalidateQueries({ queryKey }), 3000)
  }

  const patchAllCaches = (patch: (list: TransactionType[]) => TransactionType[]) => {
    qc.getQueryCache()
      .findAll({ queryKey })
      .forEach(({ queryKey: key }) => {
        qc.setQueryData<TransactionType[]>(key, (old) => (old ? patch(old) : old))
      })
  }

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
    onSuccess: async (data, variables) => {
      await cancelAndDelayInvalidate()
      const newType: TransactionType = { id: data.id, name: variables.name }
      patchAllCaches((old) => [...old, newType])
    },
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
    onSuccess: async (_data, { id, body }) => {
      await cancelAndDelayInvalidate()
      patchAllCaches((old) => old.map((t) => (t.id === id ? { ...t, name: body.name } : t)))
    },
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
    onSuccess: async (_data, id) => {
      await cancelAndDelayInvalidate()
      patchAllCaches((old) => old.filter((t) => t.id !== id))
    },
  })

  return { createTransactionType, updateTransactionType, deleteTransactionType }
}

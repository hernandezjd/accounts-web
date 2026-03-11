import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/transaction-type-command-api'
import type { TransactionType } from '@/hooks/api/useTransactionTypes'

type CreateTransactionTypeRequest = components['schemas']['CreateTransactionTypeRequest']
type UpdateTransactionTypeRequest = components['schemas']['UpdateTransactionTypeRequest']
type TransactionTypeCommandResponse = components['schemas']['TransactionTypeCommandResponse']

export function useTransactionTypeMutations() {
  const qc = useQueryClient()

  /**
   * Patch all transaction type caches matching the query key prefix.
   * This updates all variants (different filters/parameters) in one operation.
   */
  const patchAllCaches = (patch: (list: TransactionType[]) => TransactionType[]) => {
    qc.getQueryCache()
      .findAll({ queryKey: queryKeys.transactionTypes.all() })
      .forEach(({ queryKey: key }) => {
        qc.setQueryData<TransactionType[]>(key, (old) => (old ? patch(old) : old))
      })
  }

  /**
   * Invalidate all transaction type queries and transaction queries that reference types.
   */
  const invalidateTransactionTypeQueries = () => {
    qc.invalidateQueries({ queryKey: queryKeys.transactionTypes.all() })
    qc.invalidateQueries({ queryKey: queryKeys.transactions.all() })
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
    onSuccess: (data, variables) => {
      // Immediately patch all type caches with new type
      const newType: TransactionType = { id: data.id, name: variables.name }
      patchAllCaches((old) => [...old, newType])
      // Schedule background refetch for consistency
      setTimeout(() => invalidateTransactionTypeQueries(), 1000)
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
    onSuccess: (_data, { id, body }) => {
      // Immediately patch all type caches with updated type
      patchAllCaches((old) => old.map((t) => (t.id === id ? { ...t, name: body.name } : t)))
      // Schedule background refetch for consistency
      setTimeout(() => invalidateTransactionTypeQueries(), 1000)
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
    onSuccess: (_data, id) => {
      // Immediately patch all type caches to remove deleted type
      patchAllCaches((old) => old.filter((t) => t.id !== id))
      // Schedule background refetch for consistency
      setTimeout(() => invalidateTransactionTypeQueries(), 1000)
    },
  })

  return { createTransactionType, updateTransactionType, deleteTransactionType }
}

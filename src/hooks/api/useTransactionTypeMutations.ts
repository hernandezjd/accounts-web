import { useQueryClient } from '@tanstack/react-query'
import { useApiMutation } from '@/hooks/api/useApiMutation'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/transaction-type-command-api'
import type { TransactionType } from '@/hooks/api/useTransactionTypes'

type CreateTransactionTypeRequest = components['schemas']['CreateTransactionTypeRequest']
type UpdateTransactionTypeRequest = components['schemas']['UpdateTransactionTypeRequest']

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

  const createTransactionType = useApiMutation<TransactionType, CreateTransactionTypeRequest>(
    (body: CreateTransactionTypeRequest) =>
      apiClient.command.POST('/transaction-types', {
        body,
      }),
    {
      onSuccess: (data, variables) => {
        // Immediately patch all type caches with new type
        if (data?.id) {
          const newType: TransactionType = { id: data.id, name: variables.name }
          patchAllCaches((old) => [...old, newType])
        }
        // Schedule background refetch for consistency
        setTimeout(() => invalidateTransactionTypeQueries(), 1000)
      },
    },
  )

  const updateTransactionType = useApiMutation(
    ({ id, body }: { id: string; body: UpdateTransactionTypeRequest }) =>
      apiClient.command.PUT('/transaction-types/{id}', {
        params: { path: { id } },
        body,
      }),
    {
      onSuccess: (_data, { id, body }) => {
        // Immediately patch all type caches with updated type
        patchAllCaches((old) => old.map((t) => (t.id === id ? { ...t, name: body.name } : t)))
        // Schedule background refetch for consistency
        setTimeout(() => invalidateTransactionTypeQueries(), 1000)
      },
    },
  )

  const deleteTransactionType = useApiMutation(
    (id: string) =>
      apiClient.command.DELETE('/transaction-types/{id}', {
        params: { path: { id } },
      }),
    {
      onSuccess: (_data, id) => {
        // Immediately patch all type caches to remove deleted type
        patchAllCaches((old) => old.filter((t) => t.id !== id))
        // Schedule background refetch for consistency
        setTimeout(() => invalidateTransactionTypeQueries(), 1000)
      },
    },
  )

  return { createTransactionType, updateTransactionType, deleteTransactionType }
}

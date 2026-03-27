import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { useApiMutation } from './useApiMutation'
import type { components as TxnCmd } from '@/api/generated/transaction-command-api'
import type { components as IbCmd } from '@/api/generated/initial-balance-command-api'
import type { InitialBalance } from '@/hooks/api/useInitialBalances'

type CreateTransactionRequest = TxnCmd['schemas']['CreateTransactionRequest']
type EditTransactionRequest = TxnCmd['schemas']['EditTransactionRequest']
type CreateInitialBalanceRequest = IbCmd['schemas']['CreateInitialBalanceRequest']
type EditInitialBalanceRequest = IbCmd['schemas']['EditInitialBalanceRequest']

export function useTransactionMutations(tenantId: string) {
  const qc = useQueryClient()

  /**
   * Invalidate all transaction and initial balance related queries.
   * Transaction mutations affect: transaction lists, account balances, and reports.
   * Returns a Promise that resolves when invalidation is complete.
   */
  const invalidateTransactionQueries = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
      qc.invalidateQueries({ queryKey: ['accountTransactions'] }),
      qc.invalidateQueries({ queryKey: queryKeys.initialBalances.all() }),
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
      qc.invalidateQueries({ queryKey: queryKeys.reports.all() }),
    ])
    // Re-invalidate after delay to handle CQRS eventual consistency:
    // the command service returns before the event is projected to the read model
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() })
      qc.invalidateQueries({ queryKey: ['accountTransactions'] })
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
      qc.invalidateQueries({ queryKey: queryKeys.reports.all() })
    }, 1000)
  }

  /**
   * Cache patching for initial balance creation:
   * - Immediately add to cache so UI updates instantly
   * - Schedule refetch to ensure consistency with server
   */
  const patchInitialBalanceCache = (newBalance: InitialBalance) => {
    const listKey = queryKeys.initialBalances.list(tenantId)
    qc.cancelQueries({ queryKey: listKey })
    qc.setQueryData<InitialBalance[]>(listKey, (old) =>
      old ? [...old, newBalance] : old
    )
    // Background refetch after delay to verify consistency
    setTimeout(() => qc.invalidateQueries({ queryKey: queryKeys.initialBalances.all() }), 1000)
  }

  /**
   * Cache patching for initial balance update:
   * - Immediately update in cache so UI reflects change
   * - Schedule refetch to ensure consistency with server
   */
  const updateInitialBalanceInCache = (id: string, updated: InitialBalance) => {
    const listKey = queryKeys.initialBalances.list(tenantId)
    qc.cancelQueries({ queryKey: listKey })
    qc.setQueryData<InitialBalance[]>(listKey, (old) =>
      old ? old.map((ib) => (ib.id === id ? updated : ib)) : old
    )
    // Background refetch after delay to verify consistency
    setTimeout(() => qc.invalidateQueries({ queryKey: queryKeys.initialBalances.all() }), 1000)
  }

  /**
   * Cache removal for initial balance deletion:
   * - Immediately remove from cache so UI reflects deletion
   * - Schedule refetch to ensure consistency with server
   */
  const removeInitialBalanceFromCache = (id: string) => {
    const listKey = queryKeys.initialBalances.list(tenantId)
    qc.cancelQueries({ queryKey: listKey })
    qc.setQueryData<InitialBalance[]>(listKey, (old) =>
      old ? old.filter((ib) => ib.id !== id) : old
    )
    // Background refetch after delay to verify consistency
    setTimeout(() => qc.invalidateQueries({ queryKey: queryKeys.initialBalances.all() }), 1000)
  }

  const createTransaction = useApiMutation(
    (body: CreateTransactionRequest) =>
      apiClient.command.POST('/transactions', {
        body,
      }),
    {
      onSuccess: async () => {
        await invalidateTransactionQueries()
      },
    }
  )

  const editTransaction = useApiMutation(
    ({ id, body }: { id: string; body: EditTransactionRequest }) =>
      apiClient.command.PUT('/transactions/{id}', {
        params: { path: { id } },
        body,
      }),
    {
      onSuccess: async () => {
        await invalidateTransactionQueries()
      },
    }
  )

  const deleteTransaction = useApiMutation(
    (id: string) =>
      apiClient.command.DELETE('/transactions/{id}', {
        params: { path: { id } },
      }),
    {
      onSuccess: async () => {
        await invalidateTransactionQueries()
      },
    }
  )

  const createInitialBalance = useApiMutation(
    (body: CreateInitialBalanceRequest) =>
      apiClient.command.POST<InitialBalance>('/transactions/initial-balances', {
        body,
      }),
    {
      onSuccess: (data) => {
        if (data) {
          patchInitialBalanceCache(data)
        }
      },
    }
  )

  const editInitialBalance = useApiMutation(
    ({ id, body }: { id: string; body: EditInitialBalanceRequest }) =>
      apiClient.command.PUT<InitialBalance>('/transactions/initial-balances/{id}', {
        params: { path: { id } },
        body,
      }),
    {
      onSuccess: (data) => {
        if (data?.id) {
          updateInitialBalanceInCache(data.id, data)
        }
      },
    }
  )

  const deleteInitialBalance = useApiMutation(
    (id: string) =>
      apiClient.command.DELETE('/transactions/initial-balances/{id}', {
        params: { path: { id } },
      }),
    {
      onSuccess: (_data, id) => removeInitialBalanceFromCache(id),
    }
  )

  return { createTransaction, editTransaction, deleteTransaction, createInitialBalance, editInitialBalance, deleteInitialBalance }
}

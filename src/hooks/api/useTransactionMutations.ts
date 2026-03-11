import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
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
      qc.invalidateQueries({ queryKey: queryKeys.initialBalances.all() }),
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
      qc.invalidateQueries({ queryKey: queryKeys.reports.all() }),
    ])
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

  const createTransaction = useMutation({
    mutationFn: async (body: CreateTransactionRequest) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST('/transactions', {
        params: { header: { 'X-Tenant-Id': tenantId } },
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to create transaction')
      return data
    },
    onSuccess: async () => {
      await invalidateTransactionQueries()
      // Force immediate refetch to ensure UI updates without delay
      await qc.refetchQueries({
        predicate: (query) => {
          // Refetch all transaction list queries (with any filters)
          const key = query.queryKey
          return Array.isArray(key) && key[0] === 'transactions' && key[1] === 'list'
        },
        type: 'active',
      })
    },
  })

  const editTransaction = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: EditTransactionRequest }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/transactions/{id}', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to edit transaction')
      return data
    },
    onSuccess: async () => {
      await invalidateTransactionQueries()
      // Force immediate refetch to ensure UI updates without delay
      await qc.refetchQueries({
        predicate: (query) => {
          // Refetch all transaction list queries (with any filters)
          const key = query.queryKey
          return Array.isArray(key) && key[0] === 'transactions' && key[1] === 'list'
        },
        type: 'active',
      })
    },
  })

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).DELETE('/transactions/{id}', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to delete transaction')
    },
    onSuccess: async () => {
      await invalidateTransactionQueries()
      // Force immediate refetch to ensure UI updates without delay
      await qc.refetchQueries({
        predicate: (query) => {
          // Refetch all transaction list queries (with any filters)
          const key = query.queryKey
          return Array.isArray(key) && key[0] === 'transactions' && key[1] === 'list'
        },
        type: 'active',
      })
    },
  })

  const createInitialBalance = useMutation({
    mutationFn: async (body: CreateInitialBalanceRequest) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST('/transactions/initial-balances', {
        params: { header: { 'X-Tenant-Id': tenantId } },
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to create initial balance')
      return data
    },
    onSuccess: (data) => patchInitialBalanceCache(data as InitialBalance),
  })

  const editInitialBalance = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: EditInitialBalanceRequest }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/transactions/initial-balances/{id}', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
        body,
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to edit initial balance')
      return data
    },
    onSuccess: (data) => updateInitialBalanceInCache(data.id as string, data as InitialBalance),
  })

  const deleteInitialBalance = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).DELETE('/transactions/initial-balances/{id}', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to delete initial balance')
      return id
    },
    onSuccess: (id) => removeInitialBalanceFromCache(id),
  })

  return { createTransaction, editTransaction, deleteTransaction, createInitialBalance, editInitialBalance, deleteInitialBalance }
}

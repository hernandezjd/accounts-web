import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components as TxnCmd } from '@/api/generated/transaction-command-api'
import type { components as IbCmd } from '@/api/generated/initial-balance-command-api'

type CreateTransactionRequest = TxnCmd['schemas']['CreateTransactionRequest']
type EditTransactionRequest = TxnCmd['schemas']['EditTransactionRequest']
type CreateInitialBalanceRequest = IbCmd['schemas']['CreateInitialBalanceRequest']
type EditInitialBalanceRequest = IbCmd['schemas']['EditInitialBalanceRequest']

export function useTransactionMutations(tenantId: string) {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['accountTransactions', tenantId] })
    qc.invalidateQueries({ queryKey: ['transactions', tenantId] })
    qc.invalidateQueries({ queryKey: ['initialBalances', tenantId] })
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
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  })

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).DELETE('/transactions/{id}', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to delete transaction')
    },
    onSuccess: invalidate,
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
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  })

  const deleteInitialBalance = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (commandClient as any).DELETE('/transactions/initial-balances/{id}', {
        params: { path: { id }, header: { 'X-Tenant-Id': tenantId } },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to delete initial balance')
    },
    onSuccess: invalidate,
  })

  return { createTransaction, editTransaction, deleteTransaction, createInitialBalance, editInitialBalance, deleteInitialBalance }
}

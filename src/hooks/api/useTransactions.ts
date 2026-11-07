import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { useApiQuery } from './useApiQuery'
import type { components } from '@/api/generated/transaction-query-api'

export type Transaction = components['schemas']['Transaction']
export type TransactionPage = components['schemas']['TransactionPage']

export interface TransactionFilters {
  transactionTypeId?: string
  accountId?: string
  dateFrom?: string
  dateTo?: string
  [key: string]: string | undefined
}

export interface TransactionPagination {
  page: number
  size: number
}

export function useTransactions(
  workspaceId: string | null | undefined,
  filters: TransactionFilters = {},
  pagination: TransactionPagination = { page: 0, size: 50 },
) {
  const query: Record<string, string | number> = {
    page: pagination.page,
    size: pagination.size,
  }
  if (filters.transactionTypeId) query.transactionTypeId = filters.transactionTypeId
  if (filters.accountId) query.accountId = filters.accountId
  if (filters.dateFrom) query.dateFrom = filters.dateFrom
  if (filters.dateTo) query.dateTo = filters.dateTo

  return useApiQuery(
    queryKeys.transactions.list(workspaceId!, { ...filters, ...pagination }),
    () =>
      apiClient.query.GET<TransactionPage>('/transactions', {
        params: {
          query,
          header: { 'X-Workspace-Id': workspaceId! },
        },
      }),
    {
      enabled: Boolean(workspaceId),
    }
  )
}

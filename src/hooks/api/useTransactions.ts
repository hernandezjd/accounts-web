import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { useApiQuery } from './useApiQuery'
import type { components } from '@/api/generated/transaction-query-api'

export type Transaction = components['schemas']['Transaction']

export interface TransactionFilters {
  transactionTypeId?: string
  accountId?: string
  dateFrom?: string
  dateTo?: string
  [key: string]: string | undefined
}

export function useTransactions(
  tenantId: string | null | undefined,
  filters: TransactionFilters = {},
) {
  const query: Record<string, string> = {}
  if (filters.transactionTypeId) query.transactionTypeId = filters.transactionTypeId
  if (filters.accountId) query.accountId = filters.accountId
  if (filters.dateFrom) query.dateFrom = filters.dateFrom
  if (filters.dateTo) query.dateTo = filters.dateTo

  return useApiQuery(
    queryKeys.transactions.list(tenantId!, filters),
    () =>
      apiClient.query.GET<Transaction[]>('/transactions', {
        params: {
          query,
          header: { 'X-Tenant-Id': tenantId! },
        },
      }),
    {
      enabled: Boolean(tenantId),
    }
  )
}

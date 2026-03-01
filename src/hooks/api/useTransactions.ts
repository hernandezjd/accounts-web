import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import type { components } from '@/api/generated/transaction-query-api'

export type Transaction = components['schemas']['Transaction']

export interface TransactionFilters {
  transactionTypeId?: string
  accountId?: string
  dateFrom?: string
  dateTo?: string
}

async function fetchTransactions(
  tenantId: string,
  filters: TransactionFilters,
): Promise<Transaction[]> {
  const query: Record<string, string> = {}
  if (filters.transactionTypeId) query.transactionTypeId = filters.transactionTypeId
  if (filters.accountId) query.accountId = filters.accountId
  if (filters.dateFrom) query.dateFrom = filters.dateFrom
  if (filters.dateTo) query.dateTo = filters.dateTo

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/transactions', {
    params: {
      query,
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw new Error('Failed to fetch transactions')
  return data as Transaction[]
}

export function useTransactions(
  tenantId: string | null | undefined,
  filters: TransactionFilters = {},
) {
  return useQuery({
    queryKey: ['transactions', tenantId, filters],
    queryFn: () => fetchTransactions(tenantId!, filters),
    enabled: Boolean(tenantId),
  })
}

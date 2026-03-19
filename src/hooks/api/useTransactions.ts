import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import { formatError } from '@/lib/error/useErrorHandler'
import type { components } from '@/api/generated/transaction-query-api'

export type Transaction = components['schemas']['Transaction']

export interface TransactionFilters {
  transactionTypeId?: string
  accountId?: string
  dateFrom?: string
  dateTo?: string
  [key: string]: string | undefined
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

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (queryClient as any).GET('/transactions', {
      params: {
        query,
        header: { 'X-Tenant-Id': tenantId },
      },
    })

    if (error) {
      // Preserve structured error response for better error handling
      throw formatError(error)
    }
    return data as Transaction[]
  } catch (err) {
    // If it's already a formatted error, re-throw it
    if (err instanceof Error && 'errorCode' in err) {
      throw err
    }
    // Otherwise format it
    throw formatError(err)
  }
}

export function useTransactions(
  tenantId: string | null | undefined,
  filters: TransactionFilters = {},
) {
  return useQuery({
    queryKey: queryKeys.transactions.list(tenantId!, filters),
    queryFn: () => fetchTransactions(tenantId!, filters),
    enabled: Boolean(tenantId),
  })
}

import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/transaction-type-query-api'

export type TransactionType = components['schemas']['TransactionType']

export function useTransactionTypes(name?: string) {
  const query: Record<string, string> = {}
  if (name) query.name = name

  return useApiQuery<TransactionType[]>(
    [...queryKeys.transactionTypes.all(), name ?? null],
    () => apiClient.query.GET('/transaction-types', { params: { query } })
  )
}

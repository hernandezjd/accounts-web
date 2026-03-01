import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import type { components } from '@/api/generated/transaction-type-query-api'

export type TransactionType = components['schemas']['TransactionType']

async function fetchTransactionTypes(name?: string): Promise<TransactionType[]> {
  const query: Record<string, string> = {}
  if (name) query.name = name

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/transaction-types', {
    params: { query },
  })
  if (error) throw new Error('Failed to fetch transaction types')
  return data as TransactionType[]
}

export function useTransactionTypes(name?: string) {
  return useQuery({
    queryKey: ['transactionTypes', name ?? null],
    queryFn: () => fetchTransactionTypes(name),
  })
}

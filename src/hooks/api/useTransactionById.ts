import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/transaction-query-api'

export type Transaction = components['schemas']['Transaction']

async function fetchTransactionById(tenantId: string, id: string): Promise<Transaction> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/transactions/{id}', {
    params: {
      path: { id },
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw new Error('Failed to fetch transaction')
  return data as Transaction
}

export function useTransactionById(
  tenantId: string | null | undefined,
  id: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id!),
    queryFn: () => fetchTransactionById(tenantId!, id!),
    enabled: Boolean(tenantId) && Boolean(id),
  })
}

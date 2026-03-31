import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/transaction-query-api'

export type Transaction = components['schemas']['Transaction']

export function useTransactionById(
  workspaceId: string | null | undefined,
  id: string | null | undefined,
) {
  return useApiQuery<Transaction>(
    queryKeys.transactions.detail(id!),
    () =>
      apiClient.query.GET('/transactions/{id}', {
        params: {
          path: { id: id! },
          header: { 'X-Workspace-Id': workspaceId! },
        },
      }),
    { enabled: Boolean(workspaceId) && Boolean(id) },
  )
}

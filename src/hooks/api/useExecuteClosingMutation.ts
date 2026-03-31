import { useQueryClient } from '@tanstack/react-query'
import { useApiMutation } from '@/hooks/api/useApiMutation'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components as ClosingCmd } from '@/api/generated/closing-command-api'

type ExecuteClosingRequest = ClosingCmd['schemas']['ExecuteClosingRequest']

/**
 * Hook for executing account closing transactions
 * Invalidates transaction and report queries on success
 */
export function useExecuteClosingMutation(_workspaceId: string) {
  // workspaceId could be used for workspace-specific query invalidation in the future
  const qc = useQueryClient()

  const executeClosing = useApiMutation(
    (body: ExecuteClosingRequest) =>
      apiClient.command.POST('/closing/execute', {
        body,
      }),
    {
      onSuccess: async () => {
        // Closing creates a transaction, so invalidate transaction and report queries
        await Promise.all([
          qc.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
          qc.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
          qc.invalidateQueries({ queryKey: queryKeys.reports.all() }),
        ])
        // Re-invalidate after delay for eventual consistency
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: queryKeys.transactions.all() })
          qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
          qc.invalidateQueries({ queryKey: queryKeys.reports.all() })
        }, 1000)
      },
    },
  )

  return { executeClosing }
}

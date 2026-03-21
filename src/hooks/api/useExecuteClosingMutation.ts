import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components as ClosingCmd } from '@/api/generated/closing-command-api'

type ExecuteClosingRequest = ClosingCmd['schemas']['ExecuteClosingRequest']
type ExecuteClosingResponse = ClosingCmd['schemas']['ExecuteClosingResponse']

/**
 * Hook for executing account closing transactions
 * Invalidates transaction and report queries on success
 */
export function useExecuteClosingMutation(tenantId: string) {
  const qc = useQueryClient()

  const executeClosing = useMutation({
    mutationFn: async (body: ExecuteClosingRequest) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST('/closing/execute', {
        params: { header: { 'X-Tenant-Id': tenantId } },
        body,
      })
      if (error) throw error
      return data as ExecuteClosingResponse
    },
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
  })

  return { executeClosing }
}

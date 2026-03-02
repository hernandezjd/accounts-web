import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import type { components } from '@/api/generated/config-command-api'

type TenantConfigResponse = components['schemas']['TenantConfigResponse']

export function useTenantConfigMutations(tenantId: string) {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tenantConfig', tenantId] })
  }

  const headers = { 'X-Tenant-Id': tenantId }

  const setInitialDate = useMutation({
    mutationFn: async (initialDate: string): Promise<TenantConfigResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/config/initial-date', {
        params: { header: headers },
        body: { initialDate },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to set initial date')
      return data as TenantConfigResponse
    },
    onSuccess: invalidate,
  })

  const setClosedPeriodDate = useMutation({
    mutationFn: async (closedPeriodDate: string): Promise<TenantConfigResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/config/closed-period-date', {
        params: { header: headers },
        body: { closedPeriodDate },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to set closed period date')
      return data as TenantConfigResponse
    },
    onSuccess: invalidate,
  })

  const setMinimumAccountLevel = useMutation({
    mutationFn: async (minimumAccountLevel: number | null): Promise<TenantConfigResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/config/minimum-account-level', {
        params: { header: headers },
        body: { minimumAccountLevel },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to set minimum account level')
      return data as TenantConfigResponse
    },
    onSuccess: invalidate,
  })

  const setSnapshotFrequency = useMutation({
    mutationFn: async (snapshotFrequencyDays: number | null): Promise<TenantConfigResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).PUT('/config/snapshot-frequency', {
        params: { header: headers },
        body: { snapshotFrequencyDays },
      })
      if (error) throw new Error((error as { error?: string }).error ?? 'Failed to set snapshot frequency')
      return data as TenantConfigResponse
    },
    onSuccess: invalidate,
  })

  return { setInitialDate, setClosedPeriodDate, setMinimumAccountLevel, setSnapshotFrequency }
}

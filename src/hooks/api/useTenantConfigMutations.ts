import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { useApiMutation } from './useApiMutation'
import type { components } from '@/api/generated/config-command-api'
import type { TenantConfig } from '@/hooks/api/useTenantConfig'

type TenantConfigResponse = components['schemas']['TenantConfigResponse']

export function useTenantConfigMutations(tenantId: string) {
  const qc = useQueryClient()

  const configKey = queryKeys.tenantConfig.detail(tenantId)

  /**
   * Patch the tenant config cache immediately with response data,
   * then schedule a background refetch for consistency verification.
   */
  const patchCache = (patch: Partial<TenantConfig>) => {
    qc.cancelQueries({ queryKey: queryKeys.tenantConfig.all() })
    qc.setQueryData<TenantConfig>(configKey, (old) => (old ? { ...old, ...patch } : old))
    // Background refetch after delay to verify consistency
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: queryKeys.tenantConfig.all() })
      // Config changes may affect reports, so invalidate those too
      qc.invalidateQueries({ queryKey: queryKeys.reports.all() })
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() })
    }, 1000)
  }

  const headers = { 'X-Tenant-Id': tenantId }

  const setInitialDate = useApiMutation(
    (initialDate: string) =>
      apiClient.command.PUT<TenantConfigResponse>('/config/initial-date', {
        params: { header: headers },
        body: { initialDate },
      }),
    {
      onSuccess: (_data, initialDate) => patchCache({ systemInitialDate: initialDate }),
    }
  )

  const setLockedPeriodDate = useApiMutation(
    (lockedPeriodDate: string) =>
      apiClient.command.PUT<TenantConfigResponse>('/config/locked-period-date', {
        params: { header: headers },
        body: { lockedPeriodDate },
      }),
    {
      onSuccess: (_data, lockedPeriodDate) => patchCache({ lockedPeriodDate }),
    }
  )

  const setMinimumAccountLevel = useApiMutation(
    (minimumAccountLevel: number | null) =>
      apiClient.command.PUT<TenantConfigResponse>('/config/minimum-account-level', {
        params: { header: headers },
        body: { minimumAccountLevel },
      }),
    {
      onSuccess: (_data, minimumAccountLevel) => patchCache({ minimumAccountLevel }),
    }
  )

  const setSnapshotFrequency = useApiMutation(
    (snapshotFrequencyDays: number | null) =>
      apiClient.command.PUT<TenantConfigResponse>('/config/snapshot-frequency', {
        params: { header: headers },
        body: { snapshotFrequencyDays },
      }),
    {
      onSuccess: (_data, snapshotFrequencyDays) => patchCache({ snapshotFrequencyDays }),
    }
  )

  const setNominalAccountsConfig = useApiMutation(
    ({
      nominalAccounts,
      profitLossAccountId,
    }: {
      nominalAccounts: string[]
      profitLossAccountId: string
    }) =>
      apiClient.command.PUT<TenantConfigResponse>('/config/nominal-accounts-config', {
        params: { header: headers },
        body: { nominalAccounts, profitLossAccountId },
      }),
    {
      onSuccess: (_data, { nominalAccounts, profitLossAccountId }) =>
        patchCache({ nominalAccounts, profitLossAccountId }),
    }
  )

  const setClosingTransactionType = useApiMutation(
    (closingTransactionTypeId: string | null) =>
      apiClient.command.PUT<TenantConfigResponse>('/config/closing-transaction-type', {
        params: { header: headers },
        body: { closingTransactionTypeId },
      }),
    {
      onSuccess: (_data, closingTransactionTypeId) => patchCache({ closingTransactionTypeId }),
    }
  )

  return {
    setInitialDate,
    setLockedPeriodDate,
    setMinimumAccountLevel,
    setSnapshotFrequency,
    setNominalAccountsConfig,
    setClosingTransactionType,
  }
}

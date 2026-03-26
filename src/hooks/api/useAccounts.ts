import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { useApiQuery } from './useApiQuery'
import type { components } from '@/api/generated/account-query-api'

export type Account = components['schemas']['Account']

export function useAccounts(tenantId: string | null | undefined, includeInactive = false) {
  return useApiQuery(
    queryKeys.accounts.list(tenantId!, includeInactive),
    () =>
      apiClient.query.GET<Account[]>('/accounts', {
        params: {
          header: { 'X-Tenant-Id': tenantId! },
          query: includeInactive ? { includeInactive: true } : undefined,
        },
      }),
    {
      enabled: Boolean(tenantId),
    }
  )
}

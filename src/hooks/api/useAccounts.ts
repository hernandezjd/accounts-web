import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { useApiQuery } from './useApiQuery'
import type { components } from '@/api/generated/account-query-api'

export type Account = components['schemas']['Account']

export function useAccounts(workspaceId: string | null | undefined, includeInactive = false) {
  return useApiQuery(
    queryKeys.accounts.list(workspaceId!, includeInactive),
    () =>
      apiClient.query.GET<Account[]>('/accounts', {
        params: {
          header: { 'X-Workspace-Id': workspaceId! },
          query: includeInactive ? { includeInactive: true } : undefined,
        },
      }),
    {
      enabled: Boolean(workspaceId),
    }
  )
}

import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/subscription-api'

export type QuotaUsageResponse = components['schemas']['QuotaUsageResponse']

export function useOrganizationQuotaUsage(orgId: string | null | undefined) {
  return useApiQuery<QuotaUsageResponse>(
    queryKeys.quotas.orgUsage(orgId!),
    () =>
      apiClient.subscription.GET('/quotas/organization/{orgId}', {
        params: { path: { orgId: orgId! } },
      }),
    { enabled: Boolean(orgId) },
  )
}

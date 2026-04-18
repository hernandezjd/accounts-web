import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/subscription-api'

export type Subscription = components['schemas']['Subscription']

export function useOrganizationSubscription(orgId: string | null | undefined) {
  return useApiQuery<Subscription>(
    queryKeys.subscription.orgSubscription(orgId!),
    () =>
      apiClient.subscription.GET('/subscriptions/organization/{orgId}', {
        params: { path: { orgId: orgId! } },
      }),
    { enabled: Boolean(orgId) },
  )
}

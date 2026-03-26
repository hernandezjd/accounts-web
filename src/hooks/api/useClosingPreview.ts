import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components as Reporting } from '@/api/generated/reporting-api'

type ClosingPreviewRequest = Reporting['schemas']['ClosingPreviewRequest']
type ClosingPreviewResponse = Reporting['schemas']['ClosingPreviewResponse']

export function useClosingPreview(
  tenantId: string | null | undefined,
  date: string | null | undefined,
  description: string | null | undefined,
  enabled = false,
) {
  return useApiQuery<ClosingPreviewResponse>(
    queryKeys.reports.closingPreview(tenantId!, { date: date!, description: description! }),
    async () => {
      const response = await apiClient.query.POST('/reports/closing/preview', {
        params: { header: { 'X-Tenant-Id': tenantId! } },
        body: {
          date,
          description,
        } as ClosingPreviewRequest,
      })
      return {
        data: response.data as ClosingPreviewResponse,
        response,
      }
    },
    { enabled: Boolean(tenantId) && Boolean(date) && Boolean(description) && enabled },
  )
}

import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components as Reporting } from '@/api/generated/reporting-api'

type ClosingPreviewRequest = Reporting['schemas']['ClosingPreviewRequest']
type ClosingPreviewResponse = Reporting['schemas']['ClosingPreviewResponse']

async function fetchClosingPreview(
  tenantId: string,
  date: string,
  description: string,
): Promise<ClosingPreviewResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).POST('/reports/closing/preview', {
    params: { header: { 'X-Tenant-Id': tenantId } },
    body: {
      date,
      description,
    } as ClosingPreviewRequest,
  })
  if (error) {
    const msg = (error as Record<string, unknown>).message
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(error))
  }
  return data as ClosingPreviewResponse
}

export function useClosingPreview(
  tenantId: string | null | undefined,
  date: string | null | undefined,
  description: string | null | undefined,
  enabled = false,
) {
  return useQuery({
    queryKey: queryKeys.reports.closingPreview(tenantId!, { date: date!, description: description! }),
    queryFn: () => fetchClosingPreview(tenantId!, date!, description!),
    enabled: Boolean(tenantId) && Boolean(date) && Boolean(description) && enabled,
  })
}

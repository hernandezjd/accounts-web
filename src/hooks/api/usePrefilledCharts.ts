import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commandClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/prefilled-chart-api'

export type PrefilledChartSummary = components['schemas']['PrefilledChartSummary']
export type PrefilledChartDetail = components['schemas']['PrefilledChartDetail']
export type PrefilledChartAccount = components['schemas']['PrefilledChartAccount']
export type MergeReportResponse = components['schemas']['MergeReportResponse']

async function fetchPrefilledCharts(): Promise<PrefilledChartSummary[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (commandClient as any).GET('/prefilled-charts')
  if (error) throw error
  return data as PrefilledChartSummary[]
}

async function fetchPrefilledChartDetail(id: string): Promise<PrefilledChartDetail> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (commandClient as any).GET('/prefilled-charts/{id}', {
    params: { path: { id } },
  })
  if (error) throw error
  return data as PrefilledChartDetail
}

export function usePrefilledCharts() {
  return useQuery({
    queryKey: queryKeys.prefilledCharts.list(),
    queryFn: fetchPrefilledCharts,
  })
}

export function usePrefilledChartDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.prefilledCharts.detail(id!),
    queryFn: () => fetchPrefilledChartDetail(id!),
    enabled: Boolean(id),
  })
}

export function useMergePrefilledChart(tenantId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (chartId: string): Promise<MergeReportResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (commandClient as any).POST(
        '/prefilled-charts/{id}/merge',
        {
          params: {
            path: { id: chartId },
            header: { 'X-Tenant-Id': tenantId },
          },
        },
      )
      if (error)
        throw new Error((error as { error?: string }).error ?? 'Failed to merge pre-filled chart')
      return data as MergeReportResponse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
      qc.invalidateQueries({ queryKey: queryKeys.reports.all() })
    },
  })
}

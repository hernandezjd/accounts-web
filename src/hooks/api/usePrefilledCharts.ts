import { useQueryClient } from '@tanstack/react-query'
import { useApiQuery } from '@/hooks/api/useApiQuery'
import { useApiMutation } from '@/hooks/api/useApiMutation'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/prefilled-chart-api'

export type PrefilledChartSummary = components['schemas']['PrefilledChartSummary']
export type PrefilledChartDetail = components['schemas']['PrefilledChartDetail']
export type PrefilledChartAccount = components['schemas']['PrefilledChartAccount']
export type MergeReportResponse = components['schemas']['MergeReportResponse']

export function usePrefilledCharts() {
  return useApiQuery<PrefilledChartSummary[]>(
    queryKeys.prefilledCharts.list(),
    () => apiClient.command.GET('/prefilled-charts'),
  )
}

export function usePrefilledChartDetail(id: string | null) {
  return useApiQuery<PrefilledChartDetail>(
    queryKeys.prefilledCharts.detail(id!),
    () =>
      apiClient.command.GET('/prefilled-charts/{id}', {
        params: { path: { id: id! } },
      }),
    { enabled: Boolean(id) },
  )
}

export function useMergePrefilledChart(workspaceId: string) {
  const qc = useQueryClient()

  return useApiMutation<MergeReportResponse, string>(
    (chartId: string) =>
      apiClient.command.POST('/prefilled-charts/{id}/merge', {
        params: {
          path: { id: chartId },
          header: { 'X-Workspace-Id': workspaceId },
        },
      }),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: queryKeys.accounts.all() })
        qc.invalidateQueries({ queryKey: queryKeys.reports.all() })
      },
    },
  )
}

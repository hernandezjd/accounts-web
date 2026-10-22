import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/api/useApiQuery';
import { apiClient } from '@/api/apiClient';

export interface ExternalReportDataRequest {
  reportType: string;
  periodStartDate: string;
  periodEndDate: string;
  dataKey: string;
  dataValue: string;
}

export interface ExternalReportDataResponse {
  id: string;
  workspaceId: string;
  reportType: string;
  periodStartDate: string;
  periodEndDate: string;
  dataKey: string;
  dataValue: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export function useExternalReportData(
  workspaceId: string,
  reportType: string,
  periodStartDate: string,
  periodEndDate: string
) {
  const queryClient = useQueryClient();

  const queryKey = ['external-report-data', workspaceId, reportType, periodStartDate, periodEndDate];

  const { data, isLoading, error } = useApiQuery<ExternalReportDataResponse[]>(
    queryKey,
    () =>
      apiClient.query.GET<ExternalReportDataResponse[]>('/reports/external-data', {
        params: {
          query: {
            reportType,
            periodStartDate,
            periodEndDate,
          },
          header: { 'X-Workspace-Id': workspaceId },
        },
      }),
    { enabled: !!workspaceId && !!reportType && !!periodStartDate && !!periodEndDate }
  );

  const addMutation = useMutation({
    mutationFn: (request: ExternalReportDataRequest) =>
      apiClient.query.POST<ExternalReportDataResponse>('/reports/external-data', {
        body: request,
        params: {
          header: { 'X-Workspace-Id': workspaceId },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (request: ExternalReportDataRequest) =>
      apiClient.query.POST<ExternalReportDataResponse>('/reports/external-data', {
        body: request,
        params: {
          header: { 'X-Workspace-Id': workspaceId },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.query.DELETE(`/reports/external-data/${id}`, {
        params: {
          header: { 'X-Workspace-Id': workspaceId },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    data: data || [],
    isLoading,
    error,
    addData: addMutation.mutate,
    updateData: updateMutation.mutate,
    deleteData: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

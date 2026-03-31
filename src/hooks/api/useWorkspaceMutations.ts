import { useApiMutation } from '@/hooks/api/useApiMutation'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { components } from '@/api/generated/workspace-api'

type CreateWorkspaceRequest = components['schemas']['CreateWorkspaceRequest']
type UpdateWorkspaceRequest = components['schemas']['UpdateWorkspaceRequest']
type Workspace = components['schemas']['Workspace']

export function useWorkspaceMutations() {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.workspaces.all() })
  }

  const createWorkspace = useApiMutation<Workspace, CreateWorkspaceRequest>(
    (body: CreateWorkspaceRequest) => apiClient.workspace.POST('/workspaces', { body }),
    { onSuccess: invalidate }
  )

  const updateWorkspace = useApiMutation(
    ({ id, body }: { id: string; body: UpdateWorkspaceRequest }) =>
      apiClient.workspace.PUT('/workspaces/{id}', {
        params: { path: { id } },
        body,
      }),
    { onSuccess: invalidate }
  )

  const deactivateWorkspace = useApiMutation(
    (id: string) =>
      apiClient.workspace.POST('/workspaces/{id}/deactivate', {
        params: { path: { id } },
      }),
    { onSuccess: invalidate }
  )

  const reactivateWorkspace = useApiMutation(
    (id: string) =>
      apiClient.workspace.POST('/workspaces/{id}/reactivate', {
        params: { path: { id } },
      }),
    { onSuccess: invalidate }
  )

  const deleteWorkspace = useApiMutation(
    (id: string) =>
      apiClient.workspace.DELETE('/workspaces/{id}', {
        params: { path: { id } },
      }),
    { onSuccess: invalidate }
  )

  return { createWorkspace, updateWorkspace, deactivateWorkspace, reactivateWorkspace, deleteWorkspace }
}

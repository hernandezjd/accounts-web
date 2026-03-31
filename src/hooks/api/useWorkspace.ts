import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { Workspace } from '@/types'

export function useWorkspace(id: string | null | undefined) {
  return useApiQuery<Workspace>(
    queryKeys.workspaces.detail(id!),
    () => apiClient.workspace.GET('/workspaces/{id}', { params: { path: { id: id! } } }),
    { enabled: Boolean(id) }
  )
}

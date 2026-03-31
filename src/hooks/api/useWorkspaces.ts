import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { Workspace } from '@/types'

export function useWorkspaces() {
  return useApiQuery<Workspace[]>(
    queryKeys.workspaces.list(),
    () => apiClient.workspace.GET('/workspaces')
  )
}

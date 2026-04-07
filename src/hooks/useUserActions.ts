import { useParams } from 'react-router-dom'
import { useAuthContext } from './useAuthContext'

/**
 * Hook to check if the current user has a specific action permission.
 *
 * Checks the JWT token's 'workspace_actions' claim (workspace-scoped, keyed by workspaceId)
 * and 'global_actions' claim (system-wide). The workspaceId is read from the URL params.
 *
 * @returns {hasAction: (action: string) => boolean} Function to check if user has an action
 *
 * Example:
 *   const { hasAction } = useUserActions()
 *   if (hasAction('create_account')) { ... }
 */
export function useUserActions() {
  const auth = useAuthContext()
  const { workspaceId } = useParams<{ workspaceId?: string }>()

  const hasAction = (action: string): boolean => {
    if (!auth.user?.profile) {
      return false
    }

    const profile = auth.user.profile

    // Check global actions (non-workspace-scoped: manage_workspaces, manage_users, etc.)
    const globalActions = profile.global_actions as string[] | Set<string> | undefined
    if (globalActions) {
      if (globalActions instanceof Set && globalActions.has(action)) return true
      if (Array.isArray(globalActions) && globalActions.includes(action)) return true
    }

    // Check workspace-scoped actions for the current workspace
    if (workspaceId) {
      const workspaceActions = profile.workspace_actions as Record<string, string[]> | undefined
      if (workspaceActions) {
        const wsActions = workspaceActions[workspaceId]
        if (Array.isArray(wsActions) && wsActions.includes(action)) return true
      }
    }

    return false
  }

  return { hasAction }
}

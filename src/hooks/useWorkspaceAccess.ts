import { useAuthContext } from './useAuthContext'

/**
 * Hook to check if the current user has access to a specific workspace.
 *
 * Extracts the 'workspaces' claim from the JWT token. Workspaces are set by user-service
 * based on the user's workspace assignments.
 *
 * @returns {hasWorkspaceAccess: (workspaceId: string) => boolean} Function to check if user has access to a workspace
 *
 * Example:
 *   const { hasWorkspaceAccess } = useWorkspaceAccess()
 *   if (!hasWorkspaceAccess(workspaceId)) { ... show access denied ... }
 */
export function useWorkspaceAccess() {
  const auth = useAuthContext()

  const hasWorkspaceAccess = (workspaceId: string): boolean => {
    // If workspaces claim is missing, deny access
    // (tests will mock the hook to test both access and no-access scenarios)
    if (!auth?.user?.profile?.workspaces) {
      return false
    }

    const workspaces = auth.user.profile.workspaces
    // "workspaces" could be a Set or an array depending on JWT/OIDC library handling
    if (workspaces instanceof Set) {
      return workspaces.has(workspaceId) || workspaces.has('*')
    }
    if (Array.isArray(workspaces)) {
      return workspaces.includes(workspaceId) || workspaces.includes('*')
    }
    return false
  }

  return { hasWorkspaceAccess }
}

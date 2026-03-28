import { useAuthContext } from './useAuthContext'

/**
 * Hook to check if the current user has a specific action permission.
 *
 * Extracts the 'actions' claim from the JWT token. Actions are set by user-service
 * based on the union of all actions from the user's groups and roles.
 *
 * @returns {hasAction: (action: string) => boolean} Function to check if user has an action
 *
 * Example:
 *   const { hasAction } = useUserActions()
 *   if (hasAction('create_account')) { ... }
 */
export function useUserActions() {
  const auth = useAuthContext()

  const hasAction = (action: string): boolean => {
    if (!auth.user?.profile?.actions) {
      return false
    }

    const actions = auth.user.profile.actions
    // actions could be a Set or an array depending on JWT/OIDC library handling
    if (actions instanceof Set) {
      return actions.has(action)
    }
    if (Array.isArray(actions)) {
      return actions.includes(action)
    }
    return false
  }

  return { hasAction }
}

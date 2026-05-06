import { useAuthContext } from '@/hooks/useAuthContext'

export interface UserProfile {
  id: string
  email: string
  organizationIds: string[]
}

interface UseUserProfileResult {
  data: UserProfile | undefined
  isLoading: boolean
  isError: boolean
  error: null
}

/**
 * Hook to get the current user's profile from OIDC token claims.
 *
 * The OIDC token already contains:
 * - user_id: user's UUID
 * - email: user's email
 * - organization_id: user's organization ID (if assigned)
 *
 * No API call needed - all data comes from the JWT token.
 *
 * @returns User profile with organizationIds array for filtering
 */
export function useUserProfile(): UseUserProfileResult {
  const auth = useAuthContext()

  if (!auth.isAuthenticated || !auth.user?.profile) {
    return {
      data: undefined,
      isLoading: auth.isLoading,
      isError: false,
      error: null,
    }
  }

  const organizationId = (auth.user.profile as Record<string, unknown>).organization_id as string | undefined
  const organizationIds = organizationId ? [organizationId] : []

  const profile: UserProfile = {
    id: (auth.user.profile as Record<string, unknown>).user_id as string,
    email: auth.user.profile.email || '',
    organizationIds,
  }

  return {
    data: profile,
    isLoading: false,
    isError: false,
    error: null,
  }
}

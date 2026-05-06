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
 * The OIDC token contains:
 * - user_id: user's UUID
 * - email: user's email
 * - organization_ids: list of organization IDs the user belongs to
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

  const claims = auth.user.profile as Record<string, unknown>
  const organizationIds = (claims.organization_ids as string[] | undefined) ?? []

  const profile: UserProfile = {
    id: claims.user_id as string,
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

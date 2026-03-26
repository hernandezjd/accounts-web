import { useAuth as useOidcAuth } from 'react-oidc-context'

/**
 * Custom useAuthContext hook
 *
 * Provides easy access to authentication state and methods.
 * Wraps react-oidc-context's useAuth hook.
 *
 * Returns:
 *  - isAuthenticated: boolean - Whether user is logged in
 *  - isLoading: boolean - Whether auth state is still being determined
 *  - user: { sub, profile, email?, ... } - User claims from ID token
 *  - accessToken: string | undefined - JWT access token for API requests
 *  - signinRedirect(): void - Redirect to login
 *  - signoutRedirect(): void - Logout and clear tokens
 */
export function useAuthContext() {
  return useOidcAuth()
}

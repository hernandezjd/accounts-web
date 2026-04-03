import type { AuthProviderProps } from 'react-oidc-context'

/**
 * OIDC Configuration for accounts-web
 * Connects to user-service OAuth 2.0 Authorization Server
 *
 * Authority: user-service on port 8085
 * Client ID: accounts-ui (registered in user-service)
 * Redirect URI: http://localhost:5173/callback (accounts-web dev server)
 */
export const oidcConfig: AuthProviderProps = {
  authority: import.meta.env.VITE_AUTH_AUTHORITY !== undefined ? (import.meta.env.VITE_AUTH_AUTHORITY || window.location.origin) : 'http://localhost:8085',
  client_id: 'accounts-ui',
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: `${window.location.origin}`,
  response_type: 'code',
  scope: 'openid profile',

  /**
   * Callback when user signs in successfully
   * Store access token in localStorage so API clients can access it
   * NOTE: Do NOT redirect here (window.location causes full page reload and loses auth state)
   * CallbackPage handles post-login redirect via React Router
   */
  onSigninCallback: (user) => {
    if (user?.access_token) {
      localStorage.setItem('access_token', user.access_token)
    }
    if (user?.id_token) {
      localStorage.setItem('id_token', user.id_token)
    }
  },

  /**
   * Callback when user signs out
   * Clear tokens from localStorage
   */
  onSignoutCallback: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('id_token')
    localStorage.removeItem('refresh_token')
    // Redirect to home page after logout
    window.location.pathname = '/'
  },
}

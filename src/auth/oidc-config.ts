import type { AuthProviderProps } from 'react-oidc-context'

/**
 * OIDC Configuration for accounts-web
 * Connects to user-service OAuth 2.0 Authorization Server
 *
 * Authority: Can be configured via VITE_OAUTH_AUTHORITY env var
 *   - Dev: defaults to http://localhost:8085
 *   - QA/Prod: set to the same origin (nginx proxies OAuth endpoints)
 * Client ID: Can be configured via VITE_OAUTH_CLIENT_ID env var
 *   - Dev: defaults to 'web-ui'
 * Redirect URI & Post Logout URI: dynamically set to current origin
 */
export const oidcConfig: AuthProviderProps = {
  authority: import.meta.env.VITE_OAUTH_AUTHORITY || (window.location.hostname === 'localhost' ? 'http://localhost:8085' : window.location.origin),
  client_id: import.meta.env.VITE_OAUTH_CLIENT_ID || 'accounts-ui',
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

import createClient from 'openapi-fetch'
import { userManager } from '@/auth/oidc-config'

let redirectingToLogin = false

const workspaceBaseUrl = import.meta.env.VITE_WORKSPACE_API_URL ?? 'http://localhost:8080'
const commandBaseUrl = import.meta.env.VITE_COMMAND_API_URL ?? 'http://localhost:8080'
const queryBaseUrl = import.meta.env.VITE_QUERY_API_URL ?? 'http://localhost:8080'
const organizationBaseUrl = import.meta.env.VITE_ORG_API_URL ?? 'http://localhost:8084'

/**
 * Extract workspaceId from current URL pathname.
 * Handles patterns like /workspaces/workspace-1/accounting, /workspaces/workspace-uuid/config, etc.
 * Returns undefined if not in a workspace context.
 */
function extractWorkspaceIdFromUrl(): string | undefined {
  const match = window.location.pathname.match(/^\/workspaces\/([^/]+)/)
  return match?.[1]
}

/**
 * Custom fetch implementation that:
 * 1. Adds Bearer token to all requests
 * 2. Adds X-Workspace-Id header to all requests (extracted from URL)
 * 3. Handles 401 (session expired) by redirecting to login
 * 4. Handles 403 (permission denied) by letting error bubble up for display
 *
 * Retry strategy:
 * - 401: Redirect to login (authentication failure, not retryable)
 * - 403: Do NOT redirect; let error bubble up to component (authorization failure, not retryable)
 * - 5xx/network: Return response for component retry logic
 */
function createAuthenticatedFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Get the access token from localStorage
    // (set by AuthProvider's onSigninCallback)
    const token = localStorage.getItem('access_token')

    // Merge headers from the Request object (set by openapi-fetch) and init overrides
    const requestHeaders = input instanceof Request ? input.headers : undefined
    const headers = new Headers(requestHeaders ?? init?.headers ?? {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Add X-Workspace-Id header from current URL context
    const workspaceId = extractWorkspaceIdFromUrl()
    if (workspaceId) {
      headers.set('X-Workspace-Id', workspaceId)
    }

    // Make the request with the updated headers
    const response = await fetch(input, {
      ...init,
      headers,
    })

    // Handle 401 (session expired) - redirect to login via OIDC
    if (response.status === 401 && !redirectingToLogin) {
      redirectingToLogin = true
      sessionStorage.removeItem('lastWorkspaceId')
      userManager.removeUser().then(() => userManager.signinRedirect())
    }

    // Handle 403 (permission denied) - do NOT redirect
    // Let error bubble up to component for display without redirect
    if (response.status === 403) {
      // Error will be handled by calling code (component error handler)
      // Return the response so error details can be extracted
      return response
    }

    return response
  }
}

/** Client for the Workspace Service (port 8083) */
export const workspaceClient = createClient({
  baseUrl: workspaceBaseUrl,
  fetch: createAuthenticatedFetch(),
})

/** Client for Command Services: accounts, third-parties, transactions, transaction-types, config, initial-balance (port 8081) */
export const commandClient = createClient({
  baseUrl: commandBaseUrl,
  fetch: createAuthenticatedFetch(),
})

/** Client for Query Services and Reporting (port 8082) */
export const queryClient = createClient({
  baseUrl: queryBaseUrl,
  fetch: createAuthenticatedFetch(),
})

/** Client for Organization Service (port 8084) */
export const organizationClient = createClient({
  baseUrl: organizationBaseUrl,
  fetch: createAuthenticatedFetch(),
})

import createClient from 'openapi-fetch'

const tenantBaseUrl = import.meta.env.VITE_TENANT_API_URL ?? 'http://localhost:8083'
const commandBaseUrl = import.meta.env.VITE_COMMAND_API_URL ?? 'http://localhost:8081'
const queryBaseUrl = import.meta.env.VITE_QUERY_API_URL ?? 'http://localhost:8082'

/**
 * Extract tenantId from current URL pathname.
 * Handles patterns like /tenants/tenant-1/accounting, /tenants/tenant-uuid/config, etc.
 * Returns undefined if not in a tenant context.
 */
function extractTenantIdFromUrl(): string | undefined {
  const match = window.location.pathname.match(/^\/tenants\/([^/]+)/)
  return match?.[1]
}

/**
 * Custom fetch implementation that:
 * 1. Adds Bearer token to all requests
 * 2. Adds X-Tenant-Id header to all requests (extracted from URL)
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

    // Create a new headers object including the Bearer token and X-Tenant-Id
    const headers = new Headers(init?.headers ?? {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Add X-Tenant-Id header from current URL context
    const tenantId = extractTenantIdFromUrl()
    if (tenantId) {
      headers.set('X-Tenant-Id', tenantId)
    }

    // Make the request with the updated headers
    const response = await fetch(input, {
      ...init,
      headers,
    })

    // Handle 401 (session expired) - redirect to login
    if (response.status === 401) {
      // Clear the invalid token
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      localStorage.removeItem('refresh_token')

      // Clear session storage to prevent TenantPickerPage from auto-redirecting
      // back to the same page before the user re-authenticates
      sessionStorage.removeItem('lastTenantId')

      // Redirect to login
      // Using window.location to force a page reload and auth flow restart
      window.location.href = '/'
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

/** Client for the Tenant Service (port 8083) */
export const tenantClient = createClient({
  baseUrl: tenantBaseUrl,
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

import createClient from 'openapi-fetch'

const tenantBaseUrl = import.meta.env.VITE_TENANT_API_URL ?? 'http://localhost:8083'
const commandBaseUrl = import.meta.env.VITE_COMMAND_API_URL ?? 'http://localhost:8081'
const queryBaseUrl = import.meta.env.VITE_QUERY_API_URL ?? 'http://localhost:8082'

/**
 * Custom fetch implementation that:
 * 1. Adds Bearer token to all requests
 * 2. Handles 401 responses by redirecting to login
 */
function createAuthenticatedFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Get the access token from localStorage
    // (set by AuthProvider's onSigninCallback)
    const token = localStorage.getItem('access_token')

    // Create a new headers object including the Bearer token
    const headers = new Headers(init?.headers ?? {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Make the request with the updated headers
    const response = await fetch(input, {
      ...init,
      headers,
    })

    // If we get a 401, the token has expired or is invalid
    // Redirect to login
    if (response.status === 401) {
      // Clear the invalid token
      localStorage.removeItem('access_token')
      localStorage.removeItem('id_token')
      localStorage.removeItem('refresh_token')

      // Redirect to login
      // Using window.location to force a page reload and auth flow restart
      window.location.href = '/'
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

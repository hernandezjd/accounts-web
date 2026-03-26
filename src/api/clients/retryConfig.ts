/**
 * React Query Retry Configuration
 *
 * Determines which errors should be retried based on status code and error type.
 *
 * Retry Strategy:
 * - 5xx errors (503, 504) ARE retryable: transient service issues, may recover on retry
 * - 5xx errors (500, 502) are NOT retryable: permanent server bugs, retry won't fix
 * - 4xx errors are NEVER retryable: client/permission issues (invalid request, not authorized)
 * - 401 (authentication): handled by redirect in createAuthenticatedFetch(), not retryable
 * - 403 (authorization/permission): not retryable, error is shown to user
 * - Network errors ARE retryable: connectivity issues, may recover on retry
 */

/**
 * Determines if a request should be retried based on the error.
 *
 * @param error - The error object from React Query
 * @returns true if the request should be retried, false otherwise
 */
export function shouldRetryRequest(error: unknown): boolean {
  // Network errors (no response) are retryable
  if (error instanceof Error && error.message.includes('Network')) {
    return true
  }

  // Handle errors with a status code property
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as Record<string, unknown>).status as number
    return isRetryableStatus(status)
  }

  // Handle Response objects (from fetch errors)
  if (error instanceof Response) {
    return isRetryableStatus(error.status)
  }

  // Handle generic errors - default to not retrying
  return false
}

/**
 * Determines if a specific HTTP status code is retryable.
 *
 * @param status - HTTP status code
 * @returns true if the status code indicates a retryable error, false otherwise
 */
function isRetryableStatus(status: number): boolean {
  // Transient server errors (service overloaded or temporarily unavailable)
  // These may recover on retry
  if (status === 503 || status === 504) {
    return true
  }

  // Permanent server errors (bug in server logic, retry won't fix)
  if (status === 500 || status === 502) {
    return false
  }

  // Client errors (4xx):
  // - 400 (bad request) - client error, retry won't fix
  // - 401 (unauthorized) - auth expired, redirect to login (handled in fetch wrapper)
  // - 403 (forbidden) - permission denied, not retryable
  // - 404 (not found) - resource doesn't exist, not retryable
  // - 409 (conflict) - concurrent modification, might be retryable but let component decide
  if (status >= 400 && status < 500) {
    return false
  }

  // Unknown status - don't retry by default
  return false
}

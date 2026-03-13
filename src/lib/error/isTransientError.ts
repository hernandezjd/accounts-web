/**
 * Error Classification Utility
 *
 * Classifies errors as transient (retryable) or permanent (non-retryable).
 * Used throughout the application to determine retry behavior and error messaging.
 *
 * Transient errors are those that may succeed if retried:
 * - Network timeouts / connection errors
 * - 408 Request Timeout
 * - 429 Too Many Requests (rate limited)
 * - 503 Service Unavailable
 * - 504 Gateway Timeout
 *
 * Permanent errors will not be fixed by retrying:
 * - All 4xx client errors (400, 401, 403, 404, etc.)
 * - All 5xx server errors except 503/504 (500, 501, 502, 505, etc.)
 *
 * @module isTransientError
 */

export type ErrorClassification = 'transient' | 'permanent' | 'network';

/**
 * Check if an error is transient (retryable).
 * Returns true ONLY for network timeouts, 408, 429, 503, and 504 errors.
 */
export function isTransientError(
  error: unknown,
  statusCode?: number
): boolean {
  // Check for explicit status code first
  if (statusCode !== undefined) {
    return isTransientStatusCode(statusCode);
  }

  // Check if error is a network timeout/connection error
  if (isNetworkError(error)) {
    return true;
  }

  // Try to extract status code from error object
  const extractedStatusCode = extractStatusCode(error);
  if (extractedStatusCode !== undefined) {
    return isTransientStatusCode(extractedStatusCode);
  }

  // Unknown error, assume non-transient
  return false;
}

/**
 * Classify an error as transient, permanent, or network.
 * Returns 'network' for connection errors, 'transient' for retryable HTTP errors,
 * and 'permanent' for all other errors.
 */
export function classifyError(
  error: unknown,
  statusCode?: number
): ErrorClassification {
  // Network errors are always transient but classified separately
  if (isNetworkError(error)) {
    return 'network';
  }

  // Check for explicit status code first
  if (statusCode !== undefined) {
    return classifyStatusCode(statusCode);
  }

  // Try to extract status code from error object
  const extractedStatusCode = extractStatusCode(error);
  if (extractedStatusCode !== undefined) {
    return classifyStatusCode(extractedStatusCode);
  }

  // Unknown error, assume permanent
  return 'permanent';
}

/**
 * Determine if an error is a network/connection error.
 * Checks for timeout signals and connection failures.
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network timeout patterns
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('deadline exceeded')
    ) {
      return true;
    }

    // Connection failure patterns
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('failed to fetch') ||
      message.includes('fetch failed')
    ) {
      return true;
    }
  }

  // Check error code for AbortError (can indicate timeout)
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  return false;
}

/**
 * Extract HTTP status code from various error object shapes.
 */
function extractStatusCode(error: unknown): number | undefined {
  // Check for axios/fetch response error
  if (typeof error === 'object' && error !== null) {
    if ('status' in error && typeof error.status === 'number') {
      return error.status;
    }
    if ('response' in error) {
      const response = error.response;
      if (
        typeof response === 'object' &&
        response !== null &&
        'status' in response &&
        typeof response.status === 'number'
      ) {
        return response.status;
      }
    }
  }

  return undefined;
}

/**
 * Check if a specific HTTP status code is transient.
 */
function isTransientStatusCode(statusCode: number): boolean {
  // Transient codes that warrant retry
  const transientCodes = [
    408, // Request Timeout
    429, // Too Many Requests (rate limited)
    503, // Service Unavailable
    504, // Gateway Timeout
  ];

  return transientCodes.includes(statusCode);
}

/**
 * Classify a specific HTTP status code.
 */
function classifyStatusCode(statusCode: number): ErrorClassification {
  const transientCodes = [408, 429, 503, 504];

  if (transientCodes.includes(statusCode)) {
    return 'transient';
  }

  return 'permanent';
}

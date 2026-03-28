/**
 * Error Code Mapping
 *
 * Maps backend error codes to user-friendly, domain-specific messages.
 * This utility can be reused across the application and exported to other projects.
 * @module errorCodeMap
 */

export interface ErrorCodeMapping {
  message: string;
  suggestion?: string;
  supportContact?: boolean;
  isRetryable?: boolean; // Mark if this error can be retried (default: false)
  severity?: 'error' | 'warning'; // Mark as warning for non-critical issues like 403 (default: error)
}

export const ERROR_CODE_MAP: Record<string, ErrorCodeMapping> = {
  // Authentication & Authorization Errors
  HTTP_401: {
    message: 'You are not authorized. Your session has expired. Please log in again.',
    suggestion: 'Click the login button or refresh the page to re-authenticate.',
    supportContact: false,
  },

  UNAUTHORIZED_ERROR: {
    message: 'You are not authorized. Your session has expired. Please log in again.',
    suggestion: 'Click the login button or refresh the page to re-authenticate.',
    supportContact: false,
  },

  // Authorization Errors (Permission Denied - 403)
  ACTION_NOT_ALLOWED: {
    message: 'You don\'t have permission to perform this action.',
    suggestion: 'Contact your administrator if you believe you should have access to this feature.',
    supportContact: false,
    isRetryable: false,
    severity: 'warning',
  },

  INSUFFICIENT_PERMISSIONS: {
    message: 'Your role doesn\'t grant access to this feature.',
    suggestion: 'Contact your administrator to request the required permissions.',
    supportContact: false,
    isRetryable: false,
    severity: 'warning',
  },

  ROLE_REQUIRED: {
    message: 'This action requires specific permissions that your account doesn\'t have.',
    suggestion: 'Contact your administrator to request the required role or permissions.',
    supportContact: false,
    isRetryable: false,
    severity: 'warning',
  },

  TENANT_ACCESS_REQUIRED: {
    message: 'You don\'t have access to the requested tenant.',
    suggestion: 'Make sure you\'re accessing the correct tenant, or contact support if you believe this is an error.',
    supportContact: false,
    isRetryable: false,
    severity: 'warning',
  },

  FORBIDDEN: {
    message: 'You don\'t have permission to perform this action.',
    suggestion: 'Contact your administrator if you believe you should have access.',
    supportContact: false,
    isRetryable: false,
    severity: 'warning',
  },

  HTTP_403: {
    message: 'You don\'t have permission to perform this action.',
    suggestion: 'Contact your administrator if you believe you should have access.',
    supportContact: false,
    isRetryable: false,
    severity: 'warning',
  },

  // Transaction Query Errors
  TRANSACTION_QUERY_DATE_BEFORE_INITIAL_DATE: {
    message:
      "The query date range is invalid. The start date must be on or after the account\'s initial balance date.",
    suggestion:
      "Check the account\'s initial balance date and adjust your query parameters accordingly.",
    supportContact: false,
  },

  // Account Errors
  ACCOUNT_NOT_FOUND: {
    message: "The requested account could not be found.",
    suggestion: "Verify the account ID and ensure the account has not been deleted.",
    supportContact: false,
  },

  // Transaction Errors
  TRANSACTION_NOT_FOUND: {
    message: "The requested transaction could not be found.",
    suggestion: "Verify the transaction ID and ensure the transaction has not been deleted.",
    supportContact: false,
  },

  // Transaction Type Errors
  TRANSACTION_TYPE_NOT_FOUND: {
    message: "The requested transaction type could not be found.",
    suggestion: "Verify the transaction type ID and ensure it has not been deleted.",
    supportContact: false,
  },

  // Third Party Errors
  THIRD_PARTY_ACCOUNT_NOT_FOUND: {
    message: "The third-party account relationship could not be found.",
    suggestion:
      "Verify both the account ID and third-party ID. The relationship may have been deleted.",
    supportContact: false,
  },

  // System Errors
  // Note: 500, 502 are permanent errors (server bugs) - not retryable
  // Only 503 (Service Unavailable) and 504 (Gateway Timeout) are transient
  INTERNAL_SERVER_ERROR: {
    message: "An unexpected error occurred. Our team has been notified and is looking into it.",
    suggestion: "Please contact support with the request ID provided.",
    supportContact: true,
    isRetryable: false,
  },

  HTTP_500: {
    message: "An unexpected error occurred. Our team has been notified and is looking into it.",
    suggestion: "Please contact support with the request ID provided.",
    supportContact: true,
    isRetryable: false,
  },

  HTTP_502: {
    message: "The server is experiencing an error.",
    suggestion: "Please contact support with the request ID provided.",
    supportContact: true,
    isRetryable: false,
  },

  HTTP_503: {
    message: "The service is temporarily unavailable. Please try again.",
    suggestion: "Wait a moment and try again. If the problem persists, contact support.",
    supportContact: true,
    isRetryable: true,
  },

  HTTP_504: {
    message: "The request timed out. Please try again.",
    suggestion: "The server took too long to respond. Please try again.",
    supportContact: true,
    isRetryable: true,
  },

  // Fallback for unknown error codes
  UNKNOWN_ERROR: {
    message: "An error occurred while processing your request.",
    suggestion: "Please try again or contact support if the problem persists.",
    supportContact: true,
  },
};

/**
 * Get user-friendly message for an error code.
 * Returns a fallback message if the error code is not recognized.
 */
export function getErrorMessage(errorCode: string): string {
  const mapping = ERROR_CODE_MAP[errorCode] || ERROR_CODE_MAP.UNKNOWN_ERROR;
  return mapping.message;
}

/**
 * Get suggestion for an error code.
 * Returns undefined if no suggestion is available.
 */
export function getErrorSuggestion(errorCode: string): string | undefined {
  const mapping = ERROR_CODE_MAP[errorCode];
  return mapping?.suggestion;
}

/**
 * Check if support contact info should be shown for an error.
 */
export function shouldShowSupportContact(errorCode: string): boolean {
  const mapping = ERROR_CODE_MAP[errorCode];
  return mapping?.supportContact ?? false;
}

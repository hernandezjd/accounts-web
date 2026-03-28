/**
 * useErrorHandler Hook
 *
 * Provides utilities for handling structured error responses from the backend.
 * Extracts error details, formats them for user display, and manages error state.
 * @module useErrorHandler
 */

import { useState, useCallback } from 'react';
import { getErrorMessage, getErrorSuggestion, shouldShowSupportContact, ERROR_CODE_MAP } from './errorCodeMap';
import { isTransientError, classifyError, type ErrorClassification } from './isTransientError';

export interface StructuredError {
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

export interface FormattedError {
  errorCode: string;
  userMessage: string;
  suggestion?: string;
  requestId: string;
  timestamp: string;
  showSupportContact: boolean;
  rawDetails?: Record<string, unknown>;
  classification: ErrorClassification;
  isRetryable: boolean;
  severity: 'error' | 'warning';
  // Debug information (populated only when debug mode is enabled)
  httpStatus?: number;
  requestUrl?: string;
  responseBody?: string;
}

/**
 * Parse and format a structured error response from the backend.
 * Handles both structured error responses and fallback error messages.
 * Includes error classification and retry eligibility.
 */
export function formatError(error: unknown, statusCode?: number): FormattedError {
  // Handle structured error response from backend
  if (
    typeof error === 'object' &&
    error !== null &&
    'errorCode' in error &&
    'requestId' in error
  ) {
    const structuredError = error as StructuredError;
    const classification = classifyError(error, statusCode);

    // Determine if error is retryable:
    // 1. Check if errorCodeMap explicitly marks it as retryable (or non-retryable)
    // 2. Fall back to status code classification if not explicitly marked
    const errorCodeMapping = ERROR_CODE_MAP[structuredError.errorCode];
    const isRetryable = errorCodeMapping?.isRetryable ?? isTransientError(error, statusCode);

    return {
      errorCode: structuredError.errorCode,
      userMessage: getErrorMessage(structuredError.errorCode),
      suggestion: getErrorSuggestion(structuredError.errorCode),
      requestId: structuredError.requestId,
      timestamp: structuredError.timestamp,
      showSupportContact: shouldShowSupportContact(structuredError.errorCode),
      rawDetails: structuredError.details,
      classification,
      isRetryable,
      severity: errorCodeMapping?.severity ?? 'error',
    };
  }

  // Handle generic error with fallback
  const classification = classifyError(error, statusCode);
  const isRetryable = isTransientError(error, statusCode);

  return {
    errorCode: 'UNKNOWN_ERROR',
    userMessage: getErrorMessage('UNKNOWN_ERROR'),
    suggestion: getErrorSuggestion('UNKNOWN_ERROR'),
    requestId: 'MISSING_REQUEST_ID',
    timestamp: new Date().toISOString(),
    showSupportContact: true,
    classification,
    isRetryable,
    severity: 'error',
  };
}

/**
 * Parse error response from fetch/axios error.
 * Handles both successful error parsing and fallback scenarios.
 */
export async function parseErrorResponse(response: Response): Promise<FormattedError> {
  try {
    const json = await response.json();
    return formatError(json, response.status);
  } catch {
    // Fallback if response body is not JSON
    const classification = classifyError(null, response.status);
    const httpErrorCode = `HTTP_${response.status}`;

    // Check if errorCodeMap has explicit retryable setting for this HTTP status
    const errorCodeMapping = ERROR_CODE_MAP[httpErrorCode];
    const isRetryable = errorCodeMapping?.isRetryable ?? isTransientError(null, response.status);

    // Try to use mapped message for HTTP error codes, fall back to generic message
    const userMessage = getErrorMessage(httpErrorCode);

    return {
      errorCode: httpErrorCode,
      userMessage,
      requestId: response.headers.get('x-request-id') || response.headers.get('X-Request-Id') || 'MISSING_REQUEST_ID',
      timestamp: new Date().toISOString(),
      showSupportContact: true,
      classification,
      isRetryable,
      severity: errorCodeMapping?.severity ?? 'error',
    };
  }
}

/**
 * Hook for managing error state and formatting.
 * Useful for components that need to display errors to users.
 */
export function useErrorHandler() {
  const [error, setError] = useState<FormattedError | null>(null);

  const handleError = useCallback((err: unknown) => {
    const formattedError = formatError(err);
    setError(formattedError);
    return formattedError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    setError,
    handleError,
    clearError,
    hasError: error !== null,
  };
}

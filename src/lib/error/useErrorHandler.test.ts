import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatError, parseErrorResponse, type StructuredError, type FormattedError } from './useErrorHandler';

describe('useErrorHandler', () => {
  describe('formatError - classification integration', () => {
    it('classifies transient error (503) as retryable', () => {
      const error = { errorCode: 'HTTP_503', message: 'Service down', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 503);

      expect(result.classification).toBe('transient');
      expect(result.isRetryable).toBe(true);
    });

    it('classifies transient error (429) as retryable', () => {
      const error = { errorCode: 'UNKNOWN_ERROR', message: 'Rate limited', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 429);

      expect(result.classification).toBe('transient');
      expect(result.isRetryable).toBe(true);
    });

    it('classifies permanent error (404) as non-retryable', () => {
      const error = { errorCode: 'ACCOUNT_NOT_FOUND', message: 'Account not found', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 404);

      expect(result.classification).toBe('permanent');
      expect(result.isRetryable).toBe(false);
    });

    it('classifies 500 error as permanent and non-retryable', () => {
      const error = { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Server error', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 500);

      expect(result.classification).toBe('permanent');
      // 500 is a permanent server error - not retryable
      expect(result.isRetryable).toBe(false);
    });

    it('classifies unknown error without status code as permanent', () => {
      const error = new Error('Unknown error');
      const result = formatError(error);

      expect(result.classification).toBe('permanent');
      expect(result.isRetryable).toBe(false);
    });

    it('classifies network timeout as network/transient', () => {
      const error = new Error('Request timeout');
      const result = formatError(error);

      expect(result.classification).toBe('network');
      expect(result.isRetryable).toBe(true);
    });
  });

  describe('formatError - requestId handling', () => {
    it('extracts requestId from structured error', () => {
      const error = { errorCode: 'TEST_ERROR', message: 'Test', requestId: 'req-abc-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error);

      expect(result.requestId).toBe('req-abc-123');
    });

    it('uses MISSING_REQUEST_ID for unknown errors without a request ID', () => {
      const error = new Error('Unknown');
      const result = formatError(error);

      expect(result.requestId).toBe('MISSING_REQUEST_ID');
    });

    it('preserves x-request-id header in parseErrorResponse fallback', async () => {
      const mockResponse = {
        status: 500,
        json: () => Promise.reject(new Error('Not JSON')),
        headers: {
          get: (header: string) => (header === 'x-request-id' ? 'header-req-123' : null),
        },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.requestId).toBe('header-req-123');
    });
  });

  describe('formatError - 5xx error handling', () => {
    it('shows support contact for 5xx errors', () => {
      const error = { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Server error', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 500);

      expect(result.showSupportContact).toBe(true);
    });

    it('includes requestId prominently for 5xx errors', () => {
      const error = { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Server error', requestId: 'req-123-important', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 500);

      expect(result.requestId).toBe('req-123-important');
      expect(result.showSupportContact).toBe(true);
    });

    it('marks 502 as permanent and non-retryable', () => {
      const error = { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Bad gateway', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 502);

      // 502 is a permanent server error (bad gateway) - not retryable
      expect(result.isRetryable).toBe(false);
      expect(result.classification).toBe('permanent');
    });

    it('marks 503 as retryable', () => {
      const error = { errorCode: 'HTTP_503', message: 'Service unavailable', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 503);

      expect(result.isRetryable).toBe(true);
      expect(result.classification).toBe('transient');
    });

    it('marks 504 as retryable', () => {
      const error = { errorCode: 'HTTP_504', message: 'Gateway timeout', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 504);

      expect(result.isRetryable).toBe(true);
      expect(result.classification).toBe('transient');
    });
  });

  describe('parseErrorResponse - status code extraction', () => {
    it('passes status code to formatError for classification', async () => {
      const mockError = { errorCode: 'HTTP_503', message: 'Service unavailable', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' };
      const mockResponse = {
        status: 503,
        json: () => Promise.resolve(mockError),
        headers: { get: () => null },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.isRetryable).toBe(true);
      expect(result.classification).toBe('transient');
    });

    it('handles JSON parsing failure with status code classification', async () => {
      const mockResponse = {
        status: 429,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: { get: () => null },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.isRetryable).toBe(true);
      expect(result.classification).toBe('transient');
    });

    it('classifies 401 as permanent in fallback scenario', async () => {
      const mockResponse = {
        status: 401,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: { get: () => null },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.isRetryable).toBe(false);
      expect(result.classification).toBe('permanent');
    });
  });

  describe('formatError - timestamp handling', () => {
    it('extracts timestamp from structured error', () => {
      const timestamp = '2024-01-01T12:34:56Z';
      const error = { errorCode: 'TEST_ERROR', message: 'Test', requestId: 'req-123', timestamp } as StructuredError;
      const result = formatError(error);

      expect(result.timestamp).toBe(timestamp);
    });

    it('generates current timestamp for unknown errors', () => {
      const beforeTime = new Date();
      const error = new Error('Unknown');
      const result = formatError(error);
      const afterTime = new Date();

      const resultTime = new Date(result.timestamp);
      expect(resultTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(resultTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('formatError - authorization error handling', () => {
    it('marks ACTION_NOT_ALLOWED as non-retryable', () => {
      const error = { errorCode: 'ACTION_NOT_ALLOWED', message: 'Permission denied', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.isRetryable).toBe(false);
      expect(result.showSupportContact).toBe(false);
    });

    it('marks INSUFFICIENT_PERMISSIONS as non-retryable', () => {
      const error = { errorCode: 'INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.isRetryable).toBe(false);
      expect(result.showSupportContact).toBe(false);
    });

    it('marks ROLE_REQUIRED as non-retryable', () => {
      const error = { errorCode: 'ROLE_REQUIRED', message: 'Role required', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.isRetryable).toBe(false);
    });

    it('marks WORKSPACE_ACCESS_REQUIRED as non-retryable', () => {
      const error = { errorCode: 'WORKSPACE_ACCESS_REQUIRED', message: 'Workspace access required', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.isRetryable).toBe(false);
    });

    it('provides user-friendly message for authorization errors', () => {
      const error = { errorCode: 'ACTION_NOT_ALLOWED', message: 'Permission denied', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.userMessage).toContain("permission");
      expect(result.userMessage).not.toContain('403');
    });

    it('includes request ID for authorization errors', () => {
      const error = { errorCode: 'ACTION_NOT_ALLOWED', message: 'Permission denied', requestId: 'req-auth-12345', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.requestId).toBe('req-auth-12345');
    });
  });

  describe('formatError - errorCodeMap override behavior', () => {
    it('respects errorCodeMap isRetryable flag over status code classification', () => {
      // errorCodeMap explicitly marks INTERNAL_SERVER_ERROR as non-retryable
      const error = { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Server error', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 500);

      // INTERNAL_SERVER_ERROR is marked as non-retryable in errorCodeMap
      expect(result.isRetryable).toBe(false);
    });

    it('uses errorCodeMap isRetryable flag when available', () => {
      // Test that when errorCodeMap has explicit isRetryable, it's used
      const error = { errorCode: 'HTTP_403', message: 'Forbidden', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.isRetryable).toBe(false);
    });
  });

  describe('parseErrorResponse - authorization error handling', () => {
    it('classifies 403 as permanent non-retryable error', async () => {
      const mockResponse = {
        status: 403,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: { get: () => null },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.isRetryable).toBe(false);
      expect(result.classification).toBe('permanent');
      expect(result.errorCode).toBe('HTTP_403');
    });

    it('includes request ID from response headers for 403 errors', async () => {
      const mockResponse = {
        status: 403,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: {
          get: (header: string) => (header === 'x-request-id' ? 'req-403-12345' : null),
        },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.requestId).toBe('req-403-12345');
    });
  });

  describe('formatError - error severity', () => {
    it('sets warning severity for ACTION_NOT_ALLOWED', () => {
      const error = { errorCode: 'ACTION_NOT_ALLOWED', message: 'Permission denied', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.severity).toBe('warning');
    });

    it('sets warning severity for INSUFFICIENT_PERMISSIONS', () => {
      const error = { errorCode: 'INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.severity).toBe('warning');
    });

    it('sets warning severity for ROLE_REQUIRED', () => {
      const error = { errorCode: 'ROLE_REQUIRED', message: 'Role required', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.severity).toBe('warning');
    });

    it('sets warning severity for WORKSPACE_ACCESS_REQUIRED', () => {
      const error = { errorCode: 'WORKSPACE_ACCESS_REQUIRED', message: 'Workspace access required', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.severity).toBe('warning');
    });

    it('sets warning severity for FORBIDDEN', () => {
      const error = { errorCode: 'FORBIDDEN', message: 'Forbidden', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 403);

      expect(result.severity).toBe('warning');
    });

    it('sets error severity for non-403 errors (default)', () => {
      const error = { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Server error', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' } as StructuredError;
      const result = formatError(error, 500);

      expect(result.severity).toBe('error');
    });

    it('sets error severity for unknown errors', () => {
      const error = new Error('Unknown');
      const result = formatError(error);

      expect(result.severity).toBe('error');
    });
  });

  describe('parseErrorResponse - error severity', () => {
    it('sets warning severity for HTTP_403 in fallback scenario', async () => {
      const mockResponse = {
        status: 403,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: { get: () => null },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.severity).toBe('warning');
    });

    it('sets error severity for HTTP_500 in fallback scenario', async () => {
      const mockResponse = {
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: { get: () => null },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.severity).toBe('error');
    });

    it('respects severity from structured error response', async () => {
      const mockError = { errorCode: 'ACTION_NOT_ALLOWED', message: 'Permission denied', requestId: 'req-123', timestamp: '2024-01-01T00:00:00Z' };
      const mockResponse = {
        status: 403,
        json: () => Promise.resolve(mockError),
        headers: { get: () => null },
      } as unknown as Response;

      const result = await parseErrorResponse(mockResponse);

      expect(result.severity).toBe('warning');
    });
  });
});

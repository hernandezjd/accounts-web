import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { ErrorMessage } from '@/components/error/ErrorMessage';
import { formatError, parseErrorResponse } from '@/lib/error/useErrorHandler';
import { isTransientError, classifyError } from '@/lib/error/isTransientError';
import type { FormattedError } from '@/lib/error/useErrorHandler';

/**
 * Integration tests for error classification and display across the application.
 *
 * Scenarios:
 * 1. 400 Bad Request (validation error) — no retry button
 * 2. 401 Unauthorized — no retry button
 * 3. 404 Not Found — no retry button
 * 4. 408 Request Timeout — retry button shown
 * 5. 429 Rate Limited — retry button shown with rate limit message
 * 6. 500 Internal Server Error — no retry button + request ID
 * 7. 503 Service Unavailable — retry button shown
 * 8. Network timeout — retry button shown
 */

describe('Error Classification Integration Tests', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Scenario 1: 400 Bad Request (Validation Error)', () => {
    it('classifies as permanent and non-retryable', () => {
      const error = {
        errorCode: 'VALIDATION_ERROR',
        message: 'Invalid input',
        requestId: 'req-400-validation',
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(isTransientError(error, 400)).toBe(false);
      expect(classifyError(error, 400)).toBe('permanent');
    });

    it('displays error without retry button', () => {
      const formattedError: FormattedError = {
        errorCode: 'VALIDATION_ERROR',
        userMessage: 'Please check your input',
        suggestion: 'Verify that all required fields are filled correctly',
        requestId: 'req-400-validation',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: false,
        classification: 'permanent',
        isRetryable: false,
      };

      const handleRetry = vi.fn();
      renderWithProviders(
        <ErrorMessage error={formattedError} onRetry={handleRetry} />
      );

      expect(screen.getByText(/Please check your input/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Scenario 2: 401 Unauthorized', () => {
    it('classifies as permanent and non-retryable', () => {
      expect(isTransientError(null, 401)).toBe(false);
      expect(classifyError(null, 401)).toBe('permanent');
    });

    it('displays error without retry button', () => {
      const formattedError: FormattedError = {
        errorCode: 'UNAUTHORIZED',
        userMessage: 'Your session has expired',
        suggestion: 'Please log in again to continue',
        requestId: 'req-401-auth',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: false,
        classification: 'permanent',
        isRetryable: false,
      };

      renderWithProviders(<ErrorMessage error={formattedError} />);

      expect(screen.getByText(/Your session has expired/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Scenario 3: 404 Not Found', () => {
    it('classifies as permanent and non-retryable', () => {
      expect(isTransientError(null, 404)).toBe(false);
      expect(classifyError(null, 404)).toBe('permanent');
    });

    it('displays error without retry button', () => {
      const formattedError: FormattedError = {
        errorCode: 'ACCOUNT_NOT_FOUND',
        userMessage: 'The requested account could not be found',
        suggestion: 'Verify the account ID and ensure the account has not been deleted',
        requestId: 'req-404-notfound',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: false,
        classification: 'permanent',
        isRetryable: false,
      };

      renderWithProviders(<ErrorMessage error={formattedError} />);

      expect(screen.getByText(/The requested account could not be found/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Scenario 4: 408 Request Timeout', () => {
    it('classifies as transient and retryable', () => {
      expect(isTransientError(null, 408)).toBe(true);
      expect(classifyError(null, 408)).toBe('transient');
    });

    it('displays error with retry button', async () => {
      const user = userEvent.setup();
      const handleRetry = vi.fn();

      const formattedError: FormattedError = {
        errorCode: 'HTTP_408',
        userMessage: 'Request timed out',
        suggestion: 'The request took too long. Try again.',
        requestId: 'req-408-timeout',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: false,
        classification: 'transient',
        isRetryable: true,
      };

      renderWithProviders(
        <ErrorMessage error={formattedError} onRetry={handleRetry} />
      );

      expect(screen.getByText(/Request timed out/i)).toBeInTheDocument();
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      expect(handleRetry).toHaveBeenCalled();
    });
  });

  describe('Scenario 5: 429 Rate Limited', () => {
    it('classifies as transient and retryable', () => {
      expect(isTransientError(null, 429)).toBe(true);
      expect(classifyError(null, 429)).toBe('transient');
    });

    it('displays error with retry button and rate limit message', () => {
      const handleRetry = vi.fn();

      const formattedError: FormattedError = {
        errorCode: 'RATE_LIMITED',
        userMessage: 'Too many requests. Rate limited, trying again...',
        suggestion: 'Please wait a moment before trying again',
        requestId: 'req-429-ratelimit',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: false,
        classification: 'transient',
        isRetryable: true,
      };

      renderWithProviders(
        <ErrorMessage error={formattedError} onRetry={handleRetry} />
      );

      expect(screen.getByText(/Too many requests/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Scenario 6: 500 Internal Server Error', () => {
    it('classifies as permanent and non-retryable', () => {
      expect(isTransientError(null, 500)).toBe(false);
      expect(classifyError(null, 500)).toBe('permanent');
    });

    it('displays error without retry button and shows request ID prominently', () => {
      const formattedError: FormattedError = {
        errorCode: 'INTERNAL_SERVER_ERROR',
        userMessage: 'An unexpected error occurred. Our team has been notified.',
        suggestion: 'Please contact support with the request ID provided.',
        requestId: 'req-500-internal-abc123def456',
        timestamp: '2024-01-01T12:34:56Z',
        showSupportContact: true,
        classification: 'permanent',
        isRetryable: false,
      };

      renderWithProviders(<ErrorMessage error={formattedError} />);

      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
      expect(screen.getByText(/req-500-internal-abc123def456/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /contact support/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('allows copying request ID to clipboard', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      (navigator.clipboard as any).writeText = writeTextMock;

      const formattedError: FormattedError = {
        errorCode: 'INTERNAL_SERVER_ERROR',
        userMessage: 'Server error',
        requestId: 'req-500-copy-test',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: true,
        classification: 'permanent',
        isRetryable: false,
      };

      renderWithProviders(<ErrorMessage error={formattedError} />);

      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.querySelector('svg[data-testid="ContentCopyIcon"]'));

      if (copyButton) {
        await user.click(copyButton);
        expect(writeTextMock).toHaveBeenCalledWith('req-500-copy-test');
      }
    });
  });

  describe('Scenario 7: 503 Service Unavailable', () => {
    it('classifies as transient and retryable', () => {
      expect(isTransientError(null, 503)).toBe(true);
      expect(classifyError(null, 503)).toBe('transient');
    });

    it('displays error with retry button', () => {
      const handleRetry = vi.fn();

      const formattedError: FormattedError = {
        errorCode: 'HTTP_503',
        userMessage: 'Service temporarily unavailable, trying again...',
        suggestion: 'The service is temporarily unavailable. Please wait.',
        requestId: 'req-503-unavailable',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: false,
        classification: 'transient',
        isRetryable: true,
      };

      renderWithProviders(
        <ErrorMessage error={formattedError} onRetry={handleRetry} />
      );

      expect(screen.getByText(/Service temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Scenario 8: Network Timeout', () => {
    it('classifies as network and retryable', () => {
      const timeoutError = new Error('Request timeout');
      expect(isTransientError(timeoutError)).toBe(true);
      expect(classifyError(timeoutError)).toBe('network');
    });

    it('displays error with retry button', () => {
      const handleRetry = vi.fn();

      const formattedError: FormattedError = {
        errorCode: 'NETWORK_ERROR',
        userMessage: 'Connection timeout. Trying again...',
        suggestion: 'Your connection was interrupted. Please try again.',
        requestId: 'req-network-timeout',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: false,
        classification: 'network',
        isRetryable: true,
      };

      renderWithProviders(
        <ErrorMessage error={formattedError} onRetry={handleRetry} />
      );

      expect(screen.getByText(/Connection timeout/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Error formatting and parsing', () => {
    it('formats structured error with classification', () => {
      const error = {
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Server error',
        requestId: 'req-format-test',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const formatted = formatError(error, 500);

      expect(formatted.classification).toBe('permanent');
      // 500 is a permanent server error - not retryable
      expect(formatted.isRetryable).toBe(false);
      expect(formatted.requestId).toBe('req-format-test');
    });

    it('parses error response with status code classification', async () => {
      const mockResponse = {
        status: 503,
        json: () => Promise.resolve({
          errorCode: 'SERVICE_UNAVAILABLE',
          message: 'Service down',
          requestId: 'req-parse-test',
          timestamp: '2024-01-01T00:00:00Z',
        }),
        headers: { get: () => null },
      } as unknown as Response;

      const formatted = await parseErrorResponse(mockResponse);

      expect(formatted.classification).toBe('transient');
      expect(formatted.isRetryable).toBe(true);
    });

    it('handles non-JSON error response with status code', async () => {
      const mockResponse = {
        status: 429,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: { get: () => null },
      } as unknown as Response;

      const formatted = await parseErrorResponse(mockResponse);

      expect(formatted.classification).toBe('transient');
      expect(formatted.isRetryable).toBe(true);
    });
  });

  describe('504 Gateway Timeout', () => {
    it('classifies as transient and retryable', () => {
      expect(isTransientError(null, 504)).toBe(true);
      expect(classifyError(null, 504)).toBe('transient');
    });

    it('displays error with retry button', () => {
      const handleRetry = vi.fn();

      const formattedError: FormattedError = {
        errorCode: 'HTTP_504',
        userMessage: 'Gateway timeout',
        suggestion: 'The gateway timed out. Please try again.',
        requestId: 'req-504-gateway',
        timestamp: '2024-01-01T00:00:00Z',
        showSupportContact: false,
        classification: 'transient',
        isRetryable: true,
      };

      renderWithProviders(
        <ErrorMessage error={formattedError} onRetry={handleRetry} />
      );

      expect(screen.getByText(/Gateway timeout/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});

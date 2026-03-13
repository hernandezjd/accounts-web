import { describe, it, expect } from 'vitest';
import { isTransientError, classifyError, type ErrorClassification } from './isTransientError';

describe('isTransientError', () => {
  describe('status code classification', () => {
    it('returns true for 408 Request Timeout', () => {
      expect(isTransientError(null, 408)).toBe(true);
    });

    it('returns true for 429 Too Many Requests', () => {
      expect(isTransientError(null, 429)).toBe(true);
    });

    it('returns true for 503 Service Unavailable', () => {
      expect(isTransientError(null, 503)).toBe(true);
    });

    it('returns true for 504 Gateway Timeout', () => {
      expect(isTransientError(null, 504)).toBe(true);
    });

    it('returns false for 400 Bad Request', () => {
      expect(isTransientError(null, 400)).toBe(false);
    });

    it('returns false for 401 Unauthorized', () => {
      expect(isTransientError(null, 401)).toBe(false);
    });

    it('returns false for 403 Forbidden', () => {
      expect(isTransientError(null, 403)).toBe(false);
    });

    it('returns false for 404 Not Found', () => {
      expect(isTransientError(null, 404)).toBe(false);
    });

    it('returns false for 500 Internal Server Error', () => {
      expect(isTransientError(null, 500)).toBe(false);
    });

    it('returns false for 502 Bad Gateway', () => {
      expect(isTransientError(null, 502)).toBe(false);
    });

    it('returns false for 505 HTTP Version Not Supported', () => {
      expect(isTransientError(null, 505)).toBe(false);
    });
  });

  describe('network error detection', () => {
    it('returns true for timeout error', () => {
      const timeoutError = new Error('Request timeout');
      expect(isTransientError(timeoutError)).toBe(true);
    });

    it('returns true for connection timeout error', () => {
      const connectionError = new Error('Connection timed out');
      expect(isTransientError(connectionError)).toBe(true);
    });

    it('returns true for network error', () => {
      const networkError = new Error('Network request failed');
      expect(isTransientError(networkError)).toBe(true);
    });

    it('returns true for AbortError', () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      expect(isTransientError(abortError)).toBe(true);
    });
  });

  describe('error object extraction', () => {
    it('extracts status code from error object with status property', () => {
      const error = new Error('Network error');
      (error as any).status = 503;
      expect(isTransientError(error)).toBe(true);
    });

    it('extracts status code from error object with response.status', () => {
      const error = new Error('Network error');
      (error as any).response = { status: 429 };
      expect(isTransientError(error)).toBe(true);
    });

    it('returns false for unknown error without status code', () => {
      const error = new Error('Something went wrong');
      expect(isTransientError(error)).toBe(false);
    });
  });
});

describe('classifyError', () => {
  describe('classification by status code', () => {
    it('classifies 408 as transient', () => {
      expect(classifyError(null, 408)).toBe('transient');
    });

    it('classifies 429 as transient', () => {
      expect(classifyError(null, 429)).toBe('transient');
    });

    it('classifies 503 as transient', () => {
      expect(classifyError(null, 503)).toBe('transient');
    });

    it('classifies 504 as transient', () => {
      expect(classifyError(null, 504)).toBe('transient');
    });

    it('classifies 400 as permanent', () => {
      expect(classifyError(null, 400)).toBe('permanent');
    });

    it('classifies 500 as permanent', () => {
      expect(classifyError(null, 500)).toBe('permanent');
    });

    it('classifies 502 as permanent', () => {
      expect(classifyError(null, 502)).toBe('permanent');
    });
  });

  describe('classification by error type', () => {
    it('classifies timeout error as network', () => {
      const error = new Error('Request timeout');
      expect(classifyError(error)).toBe('network');
    });

    it('classifies connection error as network', () => {
      const error = new Error('Network request failed');
      expect(classifyError(error)).toBe('network');
    });

    it('classifies AbortError as network', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      expect(classifyError(error)).toBe('network');
    });

    it('classifies unknown error as permanent', () => {
      const error = new Error('Unknown error');
      expect(classifyError(error)).toBe('permanent');
    });
  });

  describe('error object extraction for classification', () => {
    it('classifies error with extracted transient status code', () => {
      const error = new Error('Failed');
      (error as any).status = 503;
      expect(classifyError(error)).toBe('transient');
    });

    it('classifies error with extracted permanent status code', () => {
      const error = new Error('Failed');
      (error as any).response = { status: 500 };
      expect(classifyError(error)).toBe('permanent');
    });
  });
});

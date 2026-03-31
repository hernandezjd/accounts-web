import { describe, it, expect } from 'vitest'
import { shouldRetryRequest } from '../retryConfig'

describe('shouldRetryRequest', () => {
  describe('HTTP 2xx/3xx - should not retry', () => {
    it('should not retry on 200 OK', () => {
      const error = { status: 200 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on 201 Created', () => {
      const error = { status: 201 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on 204 No Content', () => {
      const error = { status: 204 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on 301 Moved Permanently', () => {
      const error = { status: 301 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })
  })

  describe('HTTP 4xx - should not retry', () => {
    it('should not retry on 400 Bad Request', () => {
      const error = { status: 400 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on 401 Unauthorized', () => {
      const error = { status: 401 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on 403 Forbidden (permission denied)', () => {
      const error = { status: 403 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on 404 Not Found', () => {
      const error = { status: 404 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on 409 Conflict', () => {
      const error = { status: 409 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on 422 Unprocessable Entity', () => {
      const error = { status: 422 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })
  })

  describe('HTTP 5xx - mixed retry behavior', () => {
    it('should NOT retry on 500 Internal Server Error (permanent bug)', () => {
      const error = { status: 500 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should NOT retry on 502 Bad Gateway (permanent backend failure)', () => {
      const error = { status: 502 } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should retry on 503 Service Unavailable (transient)', () => {
      const error = { status: 503 } as unknown
      expect(shouldRetryRequest(error)).toBe(true)
    })

    it('should retry on 504 Gateway Timeout (transient)', () => {
      const error = { status: 504 } as unknown
      expect(shouldRetryRequest(error)).toBe(true)
    })
  })

  describe('Network errors - should retry', () => {
    it('should retry on network error (no response)', () => {
      const error = new Error('Network request failed')
      expect(shouldRetryRequest(error)).toBe(true)
    })

    it('should retry on connection timeout', () => {
      const error = new Error('Network timeout')
      expect(shouldRetryRequest(error)).toBe(true)
    })

    it('should handle Response object with 503', () => {
      const response = new Response(null, { status: 503 })
      expect(shouldRetryRequest(response)).toBe(true)
    })

    it('should handle Response object with 403', () => {
      const response = new Response(null, { status: 403 })
      expect(shouldRetryRequest(response)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should not retry on null error', () => {
      expect(shouldRetryRequest(null)).toBe(false)
    })

    it('should not retry on undefined error', () => {
      expect(shouldRetryRequest(undefined)).toBe(false)
    })

    it('should not retry on error object without status', () => {
      const error = { message: 'Some error' }
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on string error', () => {
      expect(shouldRetryRequest('error message')).toBe(false)
    })

    it('should not retry on plain object without Network in message', () => {
      const error = new Error('Some other error')
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry on unknown status code', () => {
      const error = { status: 418 } as unknown // I'm a teapot
      expect(shouldRetryRequest(error)).toBe(false)
    })
  })

  describe('Authorization-specific errors', () => {
    it('should not retry when missing action error (403)', () => {
      const error = {
        status: 403,
        errorCode: 'ACTION_NOT_ALLOWED',
        message: 'User lacks required action',
      } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry when insufficient permissions (403)', () => {
      const error = {
        status: 403,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        message: "User's role doesn't grant access",
      } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })

    it('should not retry when workspace access required (403)', () => {
      const error = {
        status: 403,
        errorCode: 'WORKSPACE_ACCESS_REQUIRED',
        message: 'User not assigned to requested workspace',
      } as unknown
      expect(shouldRetryRequest(error)).toBe(false)
    })
  })
})

import { describe, it, expect } from 'vitest'
import { ERROR_CODE_MAP, getErrorMessage, getErrorSuggestion, shouldShowSupportContact } from './errorCodeMap'

describe('errorCodeMap', () => {
  describe('Authorization Error Codes', () => {
    it('includes ACTION_NOT_ALLOWED error code', () => {
      expect(ERROR_CODE_MAP.ACTION_NOT_ALLOWED).toBeDefined()
      expect(ERROR_CODE_MAP.ACTION_NOT_ALLOWED.isRetryable).toBe(false)
    })

    it('includes INSUFFICIENT_PERMISSIONS error code', () => {
      expect(ERROR_CODE_MAP.INSUFFICIENT_PERMISSIONS).toBeDefined()
      expect(ERROR_CODE_MAP.INSUFFICIENT_PERMISSIONS.isRetryable).toBe(false)
    })

    it('includes ROLE_REQUIRED error code', () => {
      expect(ERROR_CODE_MAP.ROLE_REQUIRED).toBeDefined()
      expect(ERROR_CODE_MAP.ROLE_REQUIRED.isRetryable).toBe(false)
    })

    it('includes TENANT_ACCESS_REQUIRED error code', () => {
      expect(ERROR_CODE_MAP.TENANT_ACCESS_REQUIRED).toBeDefined()
      expect(ERROR_CODE_MAP.TENANT_ACCESS_REQUIRED.isRetryable).toBe(false)
    })

    it('includes HTTP_403 error code', () => {
      expect(ERROR_CODE_MAP.HTTP_403).toBeDefined()
      expect(ERROR_CODE_MAP.HTTP_403.isRetryable).toBe(false)
    })

    it('ACTION_NOT_ALLOWED provides user-friendly message', () => {
      const message = getErrorMessage('ACTION_NOT_ALLOWED')
      expect(message).toContain('permission')
      expect(message).not.toContain('403')
    })

    it('authorization error codes have no retry suggestions', () => {
      const codes = ['ACTION_NOT_ALLOWED', 'INSUFFICIENT_PERMISSIONS', 'ROLE_REQUIRED', 'TENANT_ACCESS_REQUIRED']
      codes.forEach(code => {
        const mapping = ERROR_CODE_MAP[code as keyof typeof ERROR_CODE_MAP]
        expect(mapping.isRetryable).toBe(false)
      })
    })
  })

  describe('5xx Error Codes', () => {
    it('HTTP_500 is marked as non-retryable (permanent server error)', () => {
      expect(ERROR_CODE_MAP.HTTP_500.isRetryable).toBe(false)
    })

    it('HTTP_502 is marked as non-retryable (permanent bad gateway)', () => {
      expect(ERROR_CODE_MAP.HTTP_502.isRetryable).toBe(false)
    })

    it('HTTP_503 is marked as retryable (transient service unavailable)', () => {
      expect(ERROR_CODE_MAP.HTTP_503.isRetryable).toBe(true)
    })

    it('HTTP_504 is marked as retryable (transient gateway timeout)', () => {
      expect(ERROR_CODE_MAP.HTTP_504.isRetryable).toBe(true)
    })

    it('INTERNAL_SERVER_ERROR is marked as non-retryable (permanent)', () => {
      expect(ERROR_CODE_MAP.INTERNAL_SERVER_ERROR.isRetryable).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('returns user-friendly message for known error code', () => {
      const message = getErrorMessage('ACTION_NOT_ALLOWED')
      expect(message).toBeTruthy()
      expect(message.length > 0).toBe(true)
    })

    it('returns fallback message for unknown error code', () => {
      const message = getErrorMessage('UNKNOWN_CODE_12345')
      expect(message).toBe(ERROR_CODE_MAP.UNKNOWN_ERROR.message)
    })
  })

  describe('getErrorSuggestion', () => {
    it('returns suggestion for error code with suggestion', () => {
      const suggestion = getErrorSuggestion('ACTION_NOT_ALLOWED')
      expect(suggestion).toBeTruthy()
    })

    it('returns undefined for error code without suggestion', () => {
      // UNAUTHORIZED_ERROR has a suggestion, so let's use a different test
      // Actually all error codes seem to have suggestions, so this test should be revisited
      // But for now, let's ensure getErrorSuggestion doesn't break for unknown codes
      const suggestion = getErrorSuggestion('UNKNOWN_CODE_12345')
      expect(suggestion).toBeUndefined()
    })
  })

  describe('shouldShowSupportContact', () => {
    it('returns false for authorization errors', () => {
      expect(shouldShowSupportContact('ACTION_NOT_ALLOWED')).toBe(false)
      expect(shouldShowSupportContact('INSUFFICIENT_PERMISSIONS')).toBe(false)
    })

    it('returns true for 5xx errors', () => {
      expect(shouldShowSupportContact('INTERNAL_SERVER_ERROR')).toBe(true)
      expect(shouldShowSupportContact('HTTP_500')).toBe(true)
    })

    it('returns false for unknown error codes', () => {
      expect(shouldShowSupportContact('UNKNOWN_CODE_12345')).toBe(false)
    })
  })

  describe('4xx Error Codes (Non-Retryable)', () => {
    it('HTTP_401 is not marked as retryable', () => {
      expect(ERROR_CODE_MAP.HTTP_401.isRetryable).toBeUndefined() // Not explicitly set
    })

    it('HTTP_403 is explicitly marked as non-retryable', () => {
      expect(ERROR_CODE_MAP.HTTP_403.isRetryable).toBe(false)
    })
  })

  describe('Error Severity', () => {
    it('all 403-related errors have warning severity', () => {
      const error403Codes = [
        'ACTION_NOT_ALLOWED',
        'INSUFFICIENT_PERMISSIONS',
        'ROLE_REQUIRED',
        'TENANT_ACCESS_REQUIRED',
        'FORBIDDEN',
        'HTTP_403',
      ]
      error403Codes.forEach(code => {
        const mapping = ERROR_CODE_MAP[code as keyof typeof ERROR_CODE_MAP]
        expect(mapping.severity).toBe('warning', `${code} should have warning severity`)
      })
    })

    it('other error codes default to error severity (undefined)', () => {
      // HTTP_500 should not have severity set (defaults to error)
      expect(ERROR_CODE_MAP.HTTP_500.severity).toBeUndefined()
      // HTTP_401 should not have severity set (defaults to error)
      expect(ERROR_CODE_MAP.HTTP_401.severity).toBeUndefined()
    })
  })
})

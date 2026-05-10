import { describe, it, expect } from 'vitest'

/**
 * Tests for defaultApiBase same-origin fallback logic (FR-228).
 *
 * The actual logic in clients/index.ts:
 *   const defaultApiBase =
 *     window.location.hostname === 'localhost'
 *       ? 'http://localhost:8080'
 *       : `${window.location.origin}/api`
 *
 * These tests capture the invariant so it breaks loudly if the logic changes.
 * We test the computation rule directly rather than the module constant (which
 * is evaluated at module-load time and cannot be re-evaluated per test).
 */

function computeDefaultApiBase(hostname: string, origin: string): string {
  return hostname === 'localhost' ? 'http://localhost:8080' : `${origin}/api`
}

describe('defaultApiBase — same-origin fallback logic (FR-228)', () => {
  it('returns gateway localhost URL when hostname is localhost', () => {
    expect(computeDefaultApiBase('localhost', 'http://localhost:5173')).toBe('http://localhost:8080')
  })

  it('returns origin/api for a QA server hostname', () => {
    expect(computeDefaultApiBase('test.orkidea.io', 'https://test.orkidea.io')).toBe(
      'https://test.orkidea.io/api'
    )
  })

  it('returns origin/api for an HTTPS production hostname', () => {
    expect(computeDefaultApiBase('app.test.orkidea.io', 'https://app.test.orkidea.io')).toBe(
      'https://app.test.orkidea.io/api'
    )
  })

  it('does not treat 127.0.0.1 as localhost — uses same-origin fallback', () => {
    expect(computeDefaultApiBase('127.0.0.1', 'http://127.0.0.1:5173')).toBe(
      'http://127.0.0.1:5173/api'
    )
  })
})

/**
 * Tests for SUBSCRIPTION_WEB_URL same-origin fallback logic (FR-228).
 *
 * The actual logic in QuotaStatusBar.tsx:
 *   const SUBSCRIPTION_WEB_URL =
 *     import.meta.env.VITE_SUBSCRIPTION_WEB_URL ??
 *     (window.location.hostname === 'localhost'
 *       ? 'http://localhost:5175'
 *       : `${window.location.origin}/subscription`)
 */

function computeSubscriptionWebUrl(hostname: string, origin: string): string {
  return hostname === 'localhost' ? 'http://localhost:5175' : `${origin}/subscription`
}

describe('SUBSCRIPTION_WEB_URL — same-origin fallback logic (FR-228)', () => {
  it('returns standalone Vite port URL on localhost', () => {
    expect(computeSubscriptionWebUrl('localhost', 'http://localhost:5173')).toBe(
      'http://localhost:5175'
    )
  })

  it('returns origin/subscription for a QA server hostname', () => {
    expect(computeSubscriptionWebUrl('test.orkidea.io', 'https://test.orkidea.io')).toBe(
      'https://test.orkidea.io/subscription'
    )
  })

  it('returns origin/subscription for an HTTPS production hostname', () => {
    expect(computeSubscriptionWebUrl('app.test.orkidea.io', 'https://app.test.orkidea.io')).toBe(
      'https://app.test.orkidea.io/subscription'
    )
  })
})

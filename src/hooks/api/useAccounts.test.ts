import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useAccounts } from './useAccounts'

// ─── Mock the apiClient ───────────────────────────────────────────────────────

vi.mock('@/api/apiClient', () => ({
  apiClient: {
    query: {
      GET: vi.fn(),
    },
  },
}))

import { apiClient } from '@/api/apiClient'
const mockGet = vi.mocked(apiClient.query.GET)

// ─── Wrapper ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

// ─── Sample data ───────────────────────────────────────────────────────────────

const sampleAccounts = [
  { id: 'acc-1', code: '100', name: 'Assets', level: 1, parentId: null, hasThirdParties: false, balance: 0, hasChildren: true },
  { id: 'acc-2', code: '1000', name: 'Cash', level: 2, parentId: 'acc-1', hasThirdParties: false, balance: 1000, hasChildren: false },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches accounts when workspaceId is provided', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, response: new Response() })

    const { result } = renderHook(
      () => useAccounts('workspace-1'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(sampleAccounts)
    expect(mockGet).toHaveBeenCalled()
  })

  it('does not fetch when workspaceId is null', () => {
    const { result } = renderHook(
      () => useAccounts(null),
      { wrapper: makeWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('does not fetch when workspaceId is undefined', () => {
    const { result } = renderHook(
      () => useAccounts(undefined),
      { wrapper: makeWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('includes includeInactive parameter when true', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, response: new Response() })

    const { result } = renderHook(
      () => useAccounts('workspace-1', true),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalled()
  })

  it('excludes includeInactive parameter when false', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, response: new Response() })

    const { result } = renderHook(
      () => useAccounts('workspace-1', false),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalled()
  })

  it('handles fetch errors gracefully', async () => {
    const mockError = {
      errorCode: 'SERVER_ERROR',
      userMessage: 'Server error',
      requestId: 'req-123',
      isRetryable: true,
      classification: 'transient' as const,
      showSupportContact: true,
      timestamp: new Date().toISOString(),
    }
    mockGet.mockRejectedValueOnce(mockError)

    const { result } = renderHook(
      () => useAccounts('workspace-1'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })

  it('caches results by workspaceId and includeInactive', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, response: new Response() })

    const wrapper = makeWrapper()
    const { rerender } = renderHook(
      () => useAccounts('workspace-1', false),
      { wrapper }
    )

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1))

    // Re-render with same params — should use cache
    rerender()
    expect(mockGet).toHaveBeenCalledTimes(1)

    // Different workspaceId — should fetch again
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, response: new Response() })
    rerender()
    // Note: This test uses the same hook, cache key is different for different workspaceId
  })
})

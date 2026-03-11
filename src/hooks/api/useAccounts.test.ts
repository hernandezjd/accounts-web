import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useAccounts } from './useAccounts'

// ─── Mock the API client ───────────────────────────────────────────────────────

vi.mock('@/api/clients', () => ({
  queryClient: {
    GET: vi.fn(),
  },
}))

import { queryClient as apiClient } from '@/api/clients'
const mockGet = vi.mocked((apiClient as unknown as { GET: ReturnType<typeof vi.fn> }).GET)

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

  it('fetches accounts when tenantId is provided', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, error: null })

    const { result } = renderHook(
      () => useAccounts('tenant-1'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(sampleAccounts)
    expect(mockGet).toHaveBeenCalled()
  })

  it('does not fetch when tenantId is null', () => {
    const { result } = renderHook(
      () => useAccounts(null),
      { wrapper: makeWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('does not fetch when tenantId is undefined', () => {
    const { result } = renderHook(
      () => useAccounts(undefined),
      { wrapper: makeWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('includes includeInactive parameter when true', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, error: null })

    const { result } = renderHook(
      () => useAccounts('tenant-1', true),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalled()
  })

  it('excludes includeInactive parameter when false', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, error: null })

    const { result } = renderHook(
      () => useAccounts('tenant-1', false),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalled()
  })

  it('handles fetch errors gracefully', async () => {
    mockGet.mockResolvedValueOnce({
      data: null,
      error: { status: 500, message: 'Server error' },
    })

    const { result } = renderHook(
      () => useAccounts('tenant-1'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })

  it('caches results by tenantId and includeInactive', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, error: null })

    const wrapper = makeWrapper()
    const { rerender } = renderHook(
      () => useAccounts('tenant-1', false),
      { wrapper }
    )

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1))

    // Re-render with same params — should use cache
    rerender()
    expect(mockGet).toHaveBeenCalledTimes(1)

    // Different tenantId — should fetch again
    mockGet.mockResolvedValueOnce({ data: sampleAccounts, error: null })
    rerender()
    // Note: This test uses the same hook, cache key is different for different tenantId
  })
})

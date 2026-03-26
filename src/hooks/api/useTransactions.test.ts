import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useTransactions } from './useTransactions'

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

const sampleTransactions = [
  { id: 'txn-1', description: 'Office supplies', date: '2026-03-01', amount: 500 },
  { id: 'txn-2', description: 'Equipment', date: '2026-03-02', amount: 1000 },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches transactions with filters', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleTransactions, response: new Response() })

    const { result } = renderHook(
      () => useTransactions('tenant-1', { dateFrom: '2026-03-01', dateTo: '2026-03-31' }),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(sampleTransactions)
  })

  it('does not fetch when tenantId is null', () => {
    const { result } = renderHook(
      () => useTransactions(null),
      { wrapper: makeWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('handles empty filters', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleTransactions, response: new Response() })

    const { result } = renderHook(
      () => useTransactions('tenant-1', {}),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(sampleTransactions)
  })

  it('applies date filters', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleTransactions, response: new Response() })

    const { result } = renderHook(
      () => useTransactions('tenant-1', { dateFrom: '2026-03-01', dateTo: '2026-03-31' }),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalledWith('/transactions', expect.any(Object))
  })

  it('applies account filter', async () => {
    mockGet.mockResolvedValueOnce({ data: [sampleTransactions[0]], response: new Response() })

    const { result } = renderHook(
      () => useTransactions('tenant-1', { accountId: 'acc-1' }),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalledWith('/transactions', expect.any(Object))
  })

  it('returns empty array when no transactions exist', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      response: new Response(),
    })

    const { result } = renderHook(
      () => useTransactions('tenant-1'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual([])
  })

  it('handles fetch errors', async () => {
    const mockError = {
      errorCode: 'SERVER_ERROR',
      userMessage: 'Server error',
      requestId: 'req-123',
      isRetryable: true,
    }
    mockGet.mockResolvedValueOnce({
      error: mockError,
      response: new Response(null, { status: 500 }),
    } as any)

    const { result } = renderHook(
      () => useTransactions('tenant-1'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})

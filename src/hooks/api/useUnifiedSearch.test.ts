import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useUnifiedSearch } from './useUnifiedSearch'

// ─── Mock the API client ───────────────────────────────────────────────────────

vi.mock('@/api/apiClient', () => ({
  apiClient: {
    query: {
      GET: vi.fn(),
    },
  },
}))

import { apiClient } from '@/api/apiClient'
const mockGet = vi.mocked((apiClient.query as unknown as { GET: ReturnType<typeof vi.fn> }).GET)

// ─── Wrapper ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

// ─── Sample data ───────────────────────────────────────────────────────────────

const sampleResponse = {
  query: 'cash',
  fromDate: '2026-01-01',
  toDate: '2026-01-31',
  accounts: [
    { accountId: 'acc-1', accountCode: '1000', accountName: 'Cash', level: 1 },
  ],
  transactions: [],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUnifiedSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shouldReturnResults_whenQueryAndWorkspaceIdProvided', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleResponse, response: new Response() })

    const { result } = renderHook(
      () => useUnifiedSearch('workspace-1', 'cash', '2026-01-01', '2026-01-31'),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.accounts).toHaveLength(1)
    expect(result.current.data?.accounts[0].accountName).toBe('Cash')
    expect(mockGet).toHaveBeenCalledWith('/reports/search', expect.objectContaining({
      params: expect.objectContaining({
        query: expect.objectContaining({ q: 'cash' }),
      }),
    }))
  })

  it('shouldNotFetch_whenQueryIsEmpty', () => {
    const { result } = renderHook(
      () => useUnifiedSearch('workspace-1', '', '2026-01-01', '2026-01-31'),
      { wrapper: makeWrapper() },
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('shouldScopeToCurrentPeriod_whenAllHistoryFalse', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleResponse, response: new Response() })

    const { result } = renderHook(
      () => useUnifiedSearch('workspace-1', 'cash', '2026-01-01', '2026-01-31'),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGet).toHaveBeenCalledWith('/reports/search', expect.objectContaining({
      params: expect.objectContaining({
        query: expect.objectContaining({
          q: 'cash',
          fromDate: '2026-01-01',
          toDate: '2026-01-31',
        }),
      }),
    }))
  })

  it('shouldRemoveDateScope_whenAllHistoryTrue', async () => {
    mockGet.mockResolvedValueOnce({ data: { ...sampleResponse, fromDate: null, toDate: null }, response: new Response() })

    const { result } = renderHook(
      () => useUnifiedSearch('workspace-1', 'cash', undefined, undefined),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const callArgs = mockGet.mock.calls[0]
    const queryParams = callArgs[1].params.query
    expect(queryParams.fromDate).toBeUndefined()
    expect(queryParams.toDate).toBeUndefined()
    expect(queryParams.q).toBe('cash')
  })
})

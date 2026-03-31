import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useTransactionById } from './useTransactionById'

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

const sampleTransaction = {
  id: 'txn-1',
  description: 'Office supplies',
  date: '2026-03-01',
  amount: 500,
  items: [
    { id: 'item-1', accountId: 'acc-1', amount: 250 },
    { id: 'item-2', accountId: 'acc-2', amount: 250 },
  ],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTransactionById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches transaction when id and workspaceId are provided', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleTransaction, response: new Response() })

    const { result } = renderHook(
      () => useTransactionById('workspace-1', 'txn-1'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(sampleTransaction)
    expect(mockGet).toHaveBeenCalled()
  })

  it('does not fetch when transactionId is null', () => {
    const { result } = renderHook(
      () => useTransactionById('workspace-1', null),
      { wrapper: makeWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('does not fetch when workspaceId is null', () => {
    const { result } = renderHook(
      () => useTransactionById(null, 'txn-1'),
      { wrapper: makeWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('refetches when transactionId changes', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleTransaction, response: new Response() })

    const wrapper = makeWrapper()
    const { rerender } = renderHook(
      ({ id }) => useTransactionById('workspace-1', id),
      { wrapper, initialProps: { id: 'txn-1' } }
    )

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1))

    mockGet.mockResolvedValueOnce({
      data: {
        ...sampleTransaction,
        id: 'txn-2',
      },
      response: new Response(),
    })

    rerender({ id: 'txn-2' })

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2))
  })

  it('handles transaction not found errors', async () => {
    mockGet.mockRejectedValueOnce(new Error('Transaction not found'))

    const { result } = renderHook(
      () => useTransactionById('workspace-1', 'invalid-txn'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })

  it('caches results by workspaceId and transactionId', async () => {
    mockGet.mockResolvedValueOnce({ data: sampleTransaction, response: new Response() })

    const wrapper = makeWrapper()
    const { rerender } = renderHook(
      () => useTransactionById('workspace-1', 'txn-1'),
      { wrapper }
    )

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1))

    // Re-render — should use cache
    rerender()
    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})

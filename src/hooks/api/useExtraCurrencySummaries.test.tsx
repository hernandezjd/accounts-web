import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useExtraCurrencySummaries } from './useExtraCurrencySummaries'

vi.mock('@/api/apiClient', () => ({
  apiClient: { query: { GET: vi.fn() } },
}))

import { apiClient } from '@/api/apiClient'

const mockGet = vi.mocked(apiClient.query.GET)

/** A plain (not simulated) response: closingBalance is the real balance. */
function plainResponse() {
  return {
    data: {
      accounts: [{ accountId: 'pl', accountCode: '3', accountName: 'Patrimonio', level: 1, closingBalance: -100 }],
    },
    error: undefined,
    response: new Response(),
  }
}

/** A closure response: each node carries original and simulated figures. */
function closureResponse() {
  return {
    data: {
      accounts: [
        {
          accountId: 'pl',
          accountCode: '3',
          accountName: 'Patrimonio',
          level: 1,
          original: { openingBalance: 0, totalDebits: 0, totalCredits: 0, closingBalance: -100 },
          simulated: { openingBalance: 0, totalDebits: 0, totalCredits: 0, closingBalance: -150 },
          children: [],
          thirdPartyChildren: [],
        },
      ],
    },
    error: undefined,
    response: new Response(),
  }
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useExtraCurrencySummaries', () => {
  it('requests the closure simulation and reads the simulated closing balance', async () => {
    mockGet.mockImplementation((_path: string, init: unknown) => {
      const { params } = init as { params: { query: Record<string, string> } }
      expect(params.query.currency).toBe('COP')
      return Promise.resolve(closureResponse()) as never
    })

    const { result } = renderHook(
      () => useExtraCurrencySummaries('ws-1', '2026-11-01', '2026-11-30', ['COP'], true),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current[0].ready).toBe(true))
    expect(mockGet.mock.calls[mockGet.mock.calls.length - 1][1]).toMatchObject({
      params: { query: { currency: 'COP', simulateClosure: true, includeZeroAccounts: true } },
    })
    expect(result.current[0].closingByAccount.get('pl')).toBe(-150)
  })

  it('does not request the simulation when the toggle is off', async () => {
    mockGet.mockImplementation(() => Promise.resolve(plainResponse()) as never)

    const { result } = renderHook(
      () => useExtraCurrencySummaries('ws-1', '2026-11-01', '2026-11-30', ['COP']),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current[0].ready).toBe(true))
    const query = mockGet.mock.calls[mockGet.mock.calls.length - 1][1] as { params: { query: Record<string, unknown> } }
    expect(query.params.query).not.toHaveProperty('simulateClosure')
    expect(result.current[0].closingByAccount.get('pl')).toBe(-100)
  })
})

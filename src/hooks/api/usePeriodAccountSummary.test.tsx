import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePeriodAccountSummary } from './usePeriodAccountSummary'

vi.mock('@/api/apiClient', () => ({
  apiClient: { query: { GET: vi.fn() } },
}))

import { apiClient } from '@/api/apiClient'

const mockGet = vi.mocked(apiClient.query.GET)

function summaryResponse(fromDate: string, toDate: string) {
  return {
    data: {
      fromDate,
      toDate,
      accounts: [
        {
          accountId: 'acc-1',
          accountCode: '1000',
          accountName: 'Activos',
          level: 1,
          openingBalance: 0,
          totalDebits: 0,
          totalCredits: 0,
          closingBalance: 0,
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

describe('usePeriodAccountSummary', () => {
  it('keeps the previous period summary while the next period loads', async () => {
    mockGet.mockImplementation((_path: string, init: any) => {
      const query = init.params.query
      if (query.fromDate === '2026-08-01') {
        // The August request stays pending for the whole assertion
        return new Promise(() => {}) as any
      }
      return Promise.resolve(summaryResponse(query.fromDate, query.toDate)) as any
    })

    const { result, rerender } = renderHook(
      ({ from, to }: { from: string; to: string }) => usePeriodAccountSummary('ws-1', from, to),
      {
        initialProps: { from: '2026-11-01', to: '2026-11-30' },
        wrapper: makeWrapper(),
      },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ from: '2026-08-01', to: '2026-08-31' })

    // While August loads, the account name must stay available so the transaction header does not fall back to the id
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.accounts[0].accountName).toBe('Activos')
  })
})

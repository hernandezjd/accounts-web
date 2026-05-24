import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useAccountMutations } from './useAccountMutations'
import { queryKeys } from '@/api/queryKeys'
import type { Account } from './useAccounts'

vi.mock('@/api/apiClient', () => ({
  apiClient: {
    command: { POST: vi.fn(), PUT: vi.fn() },
    query: { GET: vi.fn() },
  },
}))

vi.mock('@/api/polling', () => ({
  pollUntilFound: vi.fn(),
}))

import { apiClient } from '@/api/apiClient'
import { pollUntilFound } from '@/api/polling'

const mockPut = vi.mocked(apiClient.command.PUT)
const mockGet = vi.mocked(apiClient.query.GET)
const mockPoll = vi.mocked(pollUntilFound)

const WORKSPACE_ID = 'ws-1'

const existingAccounts: Account[] = [
  {
    id: 'acc-1',
    code: '100',
    name: 'Assets',
    level: 1,
    parentId: null,
    hasThirdParties: false,
    balance: 0,
    hasChildren: true,
    active: true,
  },
  {
    id: 'acc-2',
    code: '1001',
    name: 'Cash',
    level: 2,
    parentId: 'acc-1',
    hasThirdParties: false,
    balance: 0,
    hasChildren: false,
    active: true,
  },
]

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      // gcTime: Infinity keeps the seeded data alive even though no useQuery
      // subscribes to it — needed so we can inspect cache state after the
      // mutation completes.
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  // Seed both includeInactive variants with the existing accounts.
  qc.setQueryData(queryKeys.accounts.list(WORKSPACE_ID, true), existingAccounts)
  qc.setQueryData(queryKeys.accounts.list(WORKSPACE_ID, false), existingAccounts)
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
  return { qc, wrapper }
}

describe('useAccountMutations.updateAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPut.mockResolvedValue({
      data: { accountId: 'acc-2', code: '1002', name: 'Cash Renamed' },
      response: new Response(),
    } as any)
    // GET returns the updated row so the polling predicate would resolve true.
    mockGet.mockResolvedValue({
      data: [
        existingAccounts[0],
        { ...existingAccounts[1], code: '1002', name: 'Cash Renamed' },
      ],
      response: new Response(),
    } as any)
    // Drive polling: invoke the predicate once and resolve true.
    mockPoll.mockImplementation(async (predicate) => {
      await predicate()
      return true
    })
  })

  it('optimistically patches code, name, parentId and level in both includeInactive caches', async () => {
    const { qc, wrapper } = makeWrapper()
    const { result } = renderHook(() => useAccountMutations(WORKSPACE_ID), { wrapper })

    await act(async () => {
      await new Promise<void>((resolve, reject) => {
        result.current.updateAccount.mutate(
          { id: 'acc-2', body: { code: '1002', name: 'Cash Renamed' } as any },
          { onSuccess: () => resolve(), onError: (e) => reject(e) },
        )
      })
    })

    for (const includeInactive of [true, false]) {
      const cached = qc.getQueryData<Account[]>(
        queryKeys.accounts.list(WORKSPACE_ID, includeInactive),
      )!
      const updated = cached.find((a) => a.id === 'acc-2')!
      expect(updated.code).toBe('1002')
      expect(updated.name).toBe('Cash Renamed')
    }
  })

  it('recomputes level when parent changes', async () => {
    const { qc, wrapper } = makeWrapper()
    // Add a level-2 sibling we can reparent acc-2 under.
    qc.setQueryData<Account[]>(queryKeys.accounts.list(WORKSPACE_ID, true), [
      ...existingAccounts,
      {
        id: 'acc-3',
        code: '1100',
        name: 'Sub-Assets',
        level: 2,
        parentId: 'acc-1',
        hasThirdParties: false,
        balance: 0,
        hasChildren: true,
        active: true,
      },
    ])
    const { result } = renderHook(() => useAccountMutations(WORKSPACE_ID), { wrapper })

    await act(async () => {
      await new Promise<void>((resolve, reject) => {
        result.current.updateAccount.mutate(
          { id: 'acc-2', body: { code: '1001', name: 'Cash', parentId: 'acc-3' } as any },
          { onSuccess: () => resolve(), onError: (e) => reject(e) },
        )
      })
    })

    const cached = qc.getQueryData<Account[]>(queryKeys.accounts.list(WORKSPACE_ID, true))!
    const acc2 = cached.find((a) => a.id === 'acc-2')!
    expect(acc2.parentId).toBe('acc-3')
    expect(acc2.level).toBe(3)
  })

  it('polls the query API and only invalidates once the projection reflects the update', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAccountMutations(WORKSPACE_ID), { wrapper })

    await act(async () => {
      await new Promise<void>((resolve, reject) => {
        result.current.updateAccount.mutate(
          { id: 'acc-2', body: { code: '1002', name: 'Cash Renamed' } as any },
          { onSuccess: () => resolve(), onError: (e) => reject(e) },
        )
      })
    })

    await waitFor(() => expect(mockPoll).toHaveBeenCalledTimes(1))
    expect(mockPoll).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ initialDelayMs: 50, maxTimeoutMs: 10000 }),
    )
    // The predicate hits the query API directly (not the cache).
    expect(mockGet).toHaveBeenCalled()
  })

  it('polling predicate returns false until the projection reflects new code and name', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAccountMutations(WORKSPACE_ID), { wrapper })

    let capturedPredicate: (() => Promise<boolean>) | null = null
    mockPoll.mockImplementation(async (predicate) => {
      capturedPredicate = predicate as () => Promise<boolean>
      return true
    })

    // Stale projection: row still has old code/name.
    mockGet.mockResolvedValueOnce({
      data: existingAccounts,
      response: new Response(),
    } as any)
    // Then fresh projection.
    mockGet.mockResolvedValueOnce({
      data: [
        existingAccounts[0],
        { ...existingAccounts[1], code: '1002', name: 'Cash Renamed' },
      ],
      response: new Response(),
    } as any)

    await act(async () => {
      await new Promise<void>((resolve, reject) => {
        result.current.updateAccount.mutate(
          { id: 'acc-2', body: { code: '1002', name: 'Cash Renamed' } as any },
          { onSuccess: () => resolve(), onError: (e) => reject(e) },
        )
      })
    })

    expect(capturedPredicate).not.toBeNull()
    await expect(capturedPredicate!()).resolves.toBe(false)
    await expect(capturedPredicate!()).resolves.toBe(true)
  })
})

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { vi } from 'vitest'

/**
 * Builds a complete React Query mutation result for a mocked hook.
 * Tests pass only the fields they use (usually `mutate` and `isPending`); the rest
 * get the idle defaults, so the object satisfies the hook's return type.
 */
export function mockMutation<T = UseMutationResult<unknown, unknown, unknown, unknown>>(
  // NoInfer: T comes from the hook's expected return type, not from the overrides passed in
  overrides: Partial<NoInfer<T>> = {},
): T {
  const defaults = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    data: undefined,
    error: null,
    variables: undefined,
    context: undefined,
    status: 'idle',
    isIdle: true,
    isPending: false,
    isPaused: false,
    isSuccess: false,
    isError: false,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
  }
  return { ...defaults, ...overrides } as unknown as T
}

/**
 * Builds a complete React Query query result for a mocked hook.
 * Tests pass only the fields they use (usually `data`, `isLoading`, `isError`, `error`).
 */
export function mockQuery<T = UseQueryResult<unknown, unknown>>(
  // NoInfer: T comes from the hook's expected return type, not from the overrides passed in
  overrides: Partial<NoInfer<T>> = {},
): T {
  const defaults = {
    data: undefined,
    error: null,
    isLoading: false,
    isPending: false,
    isError: false,
    isSuccess: false,
    isFetching: false,
    isRefetching: false,
    isFetched: false,
    isStale: false,
    refetch: vi.fn(),
  }
  return { ...defaults, ...overrides } as unknown as T
}

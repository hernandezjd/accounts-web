import { renderHook } from '@testing-library/react'
import { useUserActions } from './useUserActions'
import * as useAuthContextModule from './useAuthContext'

describe('useUserActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns hasAction function', () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { actions: ['create_account', 'edit_account'] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useUserActions())
    expect(typeof result.current.hasAction).toBe('function')
  })

  it('returns true when user has the requested action (array)', () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { actions: ['create_account', 'edit_account'] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(true)
    expect(result.current.hasAction('edit_account')).toBe(true)
  })

  it('returns false when user does not have the requested action (array)', () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { actions: ['create_account'] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('delete_account')).toBe(false)
  })

  it('returns true when user has the requested action (Set)', () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { actions: new Set(['create_account', 'edit_account']) } },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(true)
    expect(result.current.hasAction('edit_account')).toBe(true)
  })

  it('returns false when user does not have the requested action (Set)', () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { actions: new Set(['create_account']) } },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('delete_account')).toBe(false)
  })

  it('returns false when user has no actions claim', () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: {} },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(false)
  })

  it('returns false when user is undefined', () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(false)
  })

  it('returns false when profile is undefined', () => {
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: {},
      isAuthenticated: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(false)
  })
})

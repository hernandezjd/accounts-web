import { renderHook } from '@testing-library/react'
import { useUserActions } from './useUserActions'
import * as useAuthContextModule from './useAuthContext'
import * as reactRouterDom from 'react-router-dom'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: vi.fn() }
})

const WORKSPACE_ID = 'ws-123'

function mockWithWorkspace(profile: Record<string, unknown>) {
  vi.spyOn(reactRouterDom, 'useParams').mockReturnValue({ workspaceId: WORKSPACE_ID })
  vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
    user: { profile },
    isAuthenticated: true,
    isLoading: false,
  } as any)
}

function mockWithoutWorkspace(profile: Record<string, unknown>) {
  vi.spyOn(reactRouterDom, 'useParams').mockReturnValue({})
  vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
    user: { profile },
    isAuthenticated: true,
    isLoading: false,
  } as any)
}

describe('useUserActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns hasAction function', () => {
    mockWithWorkspace({ workspace_actions: { [WORKSPACE_ID]: ['create_account'] }, global_actions: [] })
    const { result } = renderHook(() => useUserActions())
    expect(typeof result.current.hasAction).toBe('function')
  })

  it('returns true for workspace-scoped action when user has it', () => {
    mockWithWorkspace({
      workspace_actions: { [WORKSPACE_ID]: ['create_account', 'edit_account'] },
      global_actions: [],
    })
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(true)
    expect(result.current.hasAction('edit_account')).toBe(true)
  })

  it('returns false for workspace-scoped action when user does not have it', () => {
    mockWithWorkspace({
      workspace_actions: { [WORKSPACE_ID]: ['create_account'] },
      global_actions: [],
    })
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('delete_account')).toBe(false)
  })

  it('returns true for global action', () => {
    mockWithoutWorkspace({ workspace_actions: {}, global_actions: ['manage_workspaces', 'manage_users'] })
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('manage_workspaces')).toBe(true)
    expect(result.current.hasAction('manage_users')).toBe(true)
  })

  it('returns false for global action user does not have', () => {
    mockWithoutWorkspace({ workspace_actions: {}, global_actions: ['manage_users'] })
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('manage_workspaces')).toBe(false)
  })

  it('returns false for workspace action when no workspaceId in URL', () => {
    mockWithoutWorkspace({
      workspace_actions: { [WORKSPACE_ID]: ['create_account'] },
      global_actions: [],
    })
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(false)
  })

  it('returns false for workspace action from different workspace', () => {
    mockWithWorkspace({
      workspace_actions: { 'other-ws': ['create_account'] },
      global_actions: [],
    })
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(false)
  })

  it('returns false when user has no claims', () => {
    mockWithWorkspace({})
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(false)
  })

  it('returns false when user is undefined', () => {
    vi.spyOn(reactRouterDom, 'useParams').mockReturnValue({ workspaceId: WORKSPACE_ID })
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
    } as any)
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('create_account')).toBe(false)
  })

  it('global_actions as Set is supported', () => {
    vi.spyOn(reactRouterDom, 'useParams').mockReturnValue({})
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { global_actions: new Set(['manage_workspaces']), workspace_actions: {} } },
      isAuthenticated: true,
      isLoading: false,
    } as any)
    const { result } = renderHook(() => useUserActions())
    expect(result.current.hasAction('manage_workspaces')).toBe(true)
  })
})

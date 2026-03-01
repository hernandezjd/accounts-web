import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { AccountsPage } from './AccountsPage'
import type { Account } from '@/hooks/api/useAccounts'

// ─── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useAccounts', () => ({
  useAccounts: vi.fn(),
}))
vi.mock('@/hooks/api/useAccountMutations', () => ({
  useAccountMutations: vi.fn(),
}))
vi.mock('@/hooks/api/useCodeStructureConfig', () => ({
  useCodeStructureConfig: vi.fn(),
}))

import { useAccounts } from '@/hooks/api/useAccounts'
import { useAccountMutations } from '@/hooks/api/useAccountMutations'
import { useCodeStructureConfig } from '@/hooks/api/useCodeStructureConfig'

const mockUseAccounts = vi.mocked(useAccounts)
const mockUseAccountMutations = vi.mocked(useAccountMutations)
const mockUseCodeStructureConfig = vi.mocked(useCodeStructureConfig)

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleAccounts: Account[] = [
  {
    id: 'acc-1',
    code: '100',
    name: 'Assets',
    level: 1,
    parentId: null,
    hasThirdParties: false,
    balance: 0,
    hasChildren: true,
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
  },
]

const noOpMutation = { mutate: vi.fn(), isPending: false }

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  mockUseAccounts.mockReturnValue({
    data: sampleAccounts,
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useAccounts>)

  mockUseAccountMutations.mockReturnValue({
    createAccount: { ...noOpMutation },
    updateAccount: { ...noOpMutation },
    deleteAccount: { ...noOpMutation },
    toggleHasThirdParties: { ...noOpMutation },
  })

  mockUseCodeStructureConfig.mockReturnValue({
    data: { enabled: false },
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useCodeStructureConfig>)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AccountsPage', () => {
  it('renders table headers', () => {
    renderWithProviders(<AccountsPage />)

    expect(screen.getByText('Code')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Level')).toBeInTheDocument()
    expect(screen.getByText('Parent Code')).toBeInTheDocument()
    expect(screen.getByText('Has Third Parties')).toBeInTheDocument()
  })

  it('renders account rows', () => {
    renderWithProviders(<AccountsPage />)

    // '100' appears twice: as acc-1's code and as acc-2's parent code lookup
    expect(screen.getAllByText('100')).toHaveLength(2)
    expect(screen.getByText('Assets')).toBeInTheDocument()
    expect(screen.getByText('1001')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })

  it('shows parent code from lookup map', () => {
    renderWithProviders(<AccountsPage />)

    // acc-2 has parentId 'acc-1' → code '100', which is also acc-1's own code column
    expect(screen.getAllByText('100')).toHaveLength(2)
  })

  it('"New Account" button opens create dialog', async () => {
    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('new-account-btn'))

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })
  })

  it('Edit button opens dialog with account data pre-populated', async () => {
    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('edit-account-acc-1'))

    await waitFor(() => {
      expect(screen.getByText('Edit Account')).toBeInTheDocument()
      expect(screen.getByDisplayValue('100')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Assets')).toBeInTheDocument()
    })
  })

  it('Delete button opens confirmation dialog', async () => {
    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('delete-account-acc-1'))

    await waitFor(() => {
      expect(screen.getByText(/are you sure.*delete this account/i)).toBeInTheDocument()
    })
  })

  it('confirming delete calls deleteAccount mutation', async () => {
    const deleteMutate = vi.fn()
    mockUseAccountMutations.mockReturnValue({
      createAccount: { ...noOpMutation },
      updateAccount: { ...noOpMutation },
      deleteAccount: { ...noOpMutation, mutate: deleteMutate },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('delete-account-acc-1'))
    await waitFor(() => screen.getByTestId('confirm-delete-account'))
    await userEvent.click(screen.getByTestId('confirm-delete-account'))

    expect(deleteMutate).toHaveBeenCalledWith('acc-1', expect.any(Object))
  })

  it('shows friendly message on 409 delete error', async () => {
    const deleteMutate = vi.fn((_id, opts) => {
      opts.onError(new Error('409 Conflict: has transactions'))
    })
    mockUseAccountMutations.mockReturnValue({
      createAccount: { ...noOpMutation },
      updateAccount: { ...noOpMutation },
      deleteAccount: { ...noOpMutation, mutate: deleteMutate },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('delete-account-acc-1'))
    await waitFor(() => screen.getByTestId('confirm-delete-account'))
    await userEvent.click(screen.getByTestId('confirm-delete-account'))

    await waitFor(() => {
      expect(
        screen.getByText(/has transactions or children and cannot be deleted/i),
      ).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching', () => {
    mockUseAccounts.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccounts>)

    renderWithProviders(<AccountsPage />)

    expect(screen.getByText(/loading accounts/i)).toBeInTheDocument()
  })

  it('shows code-structure hint when enabled and no parent', async () => {
    mockUseCodeStructureConfig.mockReturnValue({
      data: { enabled: true, rootCodeLength: 3, segmentLengthByLevel: {} },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useCodeStructureConfig>)

    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('new-account-btn'))

    await waitFor(() => {
      expect(screen.getByText(/3-character code/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no accounts', () => {
    mockUseAccounts.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccounts>)

    renderWithProviders(<AccountsPage />)

    expect(screen.getByText(/no accounts found/i)).toBeInTheDocument()
  })
})

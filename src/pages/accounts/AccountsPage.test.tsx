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

const inactiveAccount: Account = {
  id: 'acc-3',
  code: '1002',
  name: 'Old Cash',
  level: 2,
  parentId: 'acc-1',
  hasThirdParties: false,
  balance: 0,
  hasChildren: false,
  active: false,
}

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
    deactivateAccount: { ...noOpMutation },
    activateAccount: { ...noOpMutation },
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
    expect(screen.getByText('Status')).toBeInTheDocument()
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

  it('Deactivate button opens confirmation dialog for active account', async () => {
    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('deactivate-account-acc-1'))

    await waitFor(() => {
      expect(screen.getByText(/deactivate this account/i)).toBeInTheDocument()
    })
  })

  it('confirming deactivate calls deactivateAccount mutation', async () => {
    const deactivateMutate = vi.fn()
    mockUseAccountMutations.mockReturnValue({
      createAccount: { ...noOpMutation },
      updateAccount: { ...noOpMutation },
      deactivateAccount: { ...noOpMutation, mutate: deactivateMutate },
      activateAccount: { ...noOpMutation },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('deactivate-account-acc-1'))
    await waitFor(() => screen.getByTestId('confirm-deactivate-account'))
    await userEvent.click(screen.getByTestId('confirm-deactivate-account'))

    expect(deactivateMutate).toHaveBeenCalledWith('acc-1', expect.any(Object))
  })

  it('shows friendly message on 409 deactivate error', async () => {
    const deactivateMutate = vi.fn((_id, opts) => {
      opts.onError(new Error('409 Conflict: has transactions'))
    })
    mockUseAccountMutations.mockReturnValue({
      createAccount: { ...noOpMutation },
      updateAccount: { ...noOpMutation },
      deactivateAccount: { ...noOpMutation, mutate: deactivateMutate },
      activateAccount: { ...noOpMutation },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('deactivate-account-acc-1'))
    await waitFor(() => screen.getByTestId('confirm-deactivate-account'))
    await userEvent.click(screen.getByTestId('confirm-deactivate-account'))

    await waitFor(() => {
      expect(
        screen.getByText(/child accounts and cannot be deactivated/i),
      ).toBeInTheDocument()
    })
  })

  it('shows Reactivate button for inactive accounts', async () => {
    mockUseAccounts.mockReturnValue({
      data: [...sampleAccounts, inactiveAccount],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccounts>)

    renderWithProviders(<AccountsPage />)

    expect(screen.getByTestId('reactivate-account-acc-3')).toBeInTheDocument()
    expect(screen.queryByTestId('deactivate-account-acc-3')).not.toBeInTheDocument()
  })

  it('confirming reactivate calls activateAccount mutation', async () => {
    const activateMutate = vi.fn()
    mockUseAccounts.mockReturnValue({
      data: [...sampleAccounts, inactiveAccount],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccounts>)
    mockUseAccountMutations.mockReturnValue({
      createAccount: { ...noOpMutation },
      updateAccount: { ...noOpMutation },
      deactivateAccount: { ...noOpMutation },
      activateAccount: { ...noOpMutation, mutate: activateMutate },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('reactivate-account-acc-3'))
    await waitFor(() => screen.getByTestId('confirm-reactivate-account'))
    await userEvent.click(screen.getByTestId('confirm-reactivate-account'))

    expect(activateMutate).toHaveBeenCalledWith('acc-3', expect.any(Object))
  })

  it('shows Inactive status for inactive accounts', () => {
    mockUseAccounts.mockReturnValue({
      data: [...sampleAccounts, inactiveAccount],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAccounts>)

    renderWithProviders(<AccountsPage />)

    expect(screen.getByTestId('account-status-acc-3')).toHaveTextContent('Inactive')
    expect(screen.getByTestId('account-status-acc-1')).toHaveTextContent('Active')
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

  it('parent account field is an autocomplete picker in create dialog', async () => {
    renderWithProviders(<AccountsPage />)

    await userEvent.click(screen.getByTestId('new-account-btn'))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /parent account/i })).toBeInTheDocument()
    })
  })
})

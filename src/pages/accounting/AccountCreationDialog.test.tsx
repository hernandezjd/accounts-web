import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { AccountCreationDialog } from './AccountCreationDialog'

// ─── Mock hooks ───────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useAccountMutations', () => ({
  useAccountMutations: vi.fn(),
}))
vi.mock('@/hooks/api/useAccounts', () => ({
  useAccounts: vi.fn(),
}))

import { useAccountMutations } from '@/hooks/api/useAccountMutations'
import { useAccounts } from '@/hooks/api/useAccounts'

const mockUseAccountMutations = vi.mocked(useAccountMutations)
const mockUseAccounts = vi.mocked(useAccounts)

const sampleAccounts = [
  { id: 'acc-1', code: '100', name: 'Assets', level: 1, parentId: null, hasThirdParties: false, balance: 0, hasChildren: true },
  { id: 'acc-2', code: '1001', name: 'Cash', level: 2, parentId: 'acc-1', hasThirdParties: false, balance: 0, hasChildren: false },
]

const noOpMutation = { mutate: vi.fn(), isPending: false }

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAccountMutations.mockReturnValue({
    createAccount: { ...noOpMutation },
    updateAccount: { ...noOpMutation },
    deleteAccount: { ...noOpMutation },
    toggleHasThirdParties: { ...noOpMutation },
  })
  mockUseAccounts.mockReturnValue({
    data: sampleAccounts,
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useAccounts>)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AccountCreationDialog', () => {
  it('renders code, name, and parent picker fields', () => {
    renderWithProviders(
      <AccountCreationDialog tenantId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    expect(screen.getByTestId('account-code-input')).toBeInTheDocument()
    expect(screen.getByTestId('account-name-input')).toBeInTheDocument()
    // Parent picker is an Autocomplete combobox
    expect(screen.getByRole('combobox', { name: /parent account/i })).toBeInTheDocument()
  })

  it('parent picker is an Autocomplete (not a plain text field)', () => {
    renderWithProviders(
      <AccountCreationDialog tenantId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    const combobox = screen.getByRole('combobox', { name: /parent account/i })
    expect(combobox).toBeInTheDocument()
    // An Autocomplete combobox has role="combobox"; a plain TextField does not
    expect(combobox.getAttribute('role')).toBe('combobox')
  })

  it('submits with correct parentId from selected account', async () => {
    const createMutate = vi.fn()
    mockUseAccountMutations.mockReturnValue({
      createAccount: { mutate: createMutate, isPending: false },
      updateAccount: { ...noOpMutation },
      deleteAccount: { ...noOpMutation },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(
      <AccountCreationDialog tenantId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    // Fill in code and name
    await userEvent.type(screen.getByTestId('account-code-input'), '10011')
    await userEvent.type(screen.getByTestId('account-name-input'), 'Petty Cash')

    // Pick parent account from Autocomplete
    await userEvent.click(screen.getByRole('combobox', { name: /parent account/i }))
    await waitFor(() => screen.getByText('100 — Assets'))
    await userEvent.click(screen.getByText('100 — Assets'))

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'acc-1' }),
      expect.any(Object),
    )
  })

  it('submits without parentId when no parent selected', async () => {
    const createMutate = vi.fn()
    mockUseAccountMutations.mockReturnValue({
      createAccount: { mutate: createMutate, isPending: false },
      updateAccount: { ...noOpMutation },
      deleteAccount: { ...noOpMutation },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(
      <AccountCreationDialog tenantId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    await userEvent.type(screen.getByTestId('account-code-input'), '200')
    await userEvent.type(screen.getByTestId('account-name-input'), 'Liabilities')

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: undefined }),
      expect.any(Object),
    )
  })
})

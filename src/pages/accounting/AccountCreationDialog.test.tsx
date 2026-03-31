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
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    expect(screen.getByTestId('account-code-input')).toBeInTheDocument()
    expect(screen.getByTestId('account-name-input')).toBeInTheDocument()
    // Parent picker is an Autocomplete combobox
    expect(screen.getByRole('combobox', { name: /parent account/i })).toBeInTheDocument()
  })

  it('parent picker is an Autocomplete (not a plain text field)', () => {
    renderWithProviders(
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
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
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
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
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    await userEvent.type(screen.getByTestId('account-code-input'), '200')
    await userEvent.type(screen.getByTestId('account-name-input'), 'Liabilities')

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: undefined }),
      expect.any(Object),
    )
  })

  it('renders hasThirdParties checkbox with correct label', () => {
    renderWithProviders(
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    const checkbox = screen.getByTestId('has-third-parties-checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(screen.getByLabelText(/has third parties/i)).toBeInTheDocument()
  })

  it('hasThirdParties checkbox defaults to unchecked', () => {
    renderWithProviders(
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    const input = screen.getByTestId('has-third-parties-checkbox').querySelector('input') as HTMLInputElement
    expect(input.checked).toBe(false)
  })

  it('submits with hasThirdParties false by default', async () => {
    const createMutate = vi.fn()
    mockUseAccountMutations.mockReturnValue({
      createAccount: { mutate: createMutate, isPending: false },
      updateAccount: { ...noOpMutation },
      deleteAccount: { ...noOpMutation },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    await userEvent.type(screen.getByTestId('account-code-input'), '300')
    await userEvent.type(screen.getByTestId('account-name-input'), 'Revenue')

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ hasThirdParties: false }),
      expect.any(Object),
    )
  })

  it('submits with hasThirdParties true when checkbox is checked', async () => {
    const createMutate = vi.fn()
    mockUseAccountMutations.mockReturnValue({
      createAccount: { mutate: createMutate, isPending: false },
      updateAccount: { ...noOpMutation },
      deleteAccount: { ...noOpMutation },
      toggleHasThirdParties: { ...noOpMutation },
    })

    renderWithProviders(
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />,
    )

    await userEvent.type(screen.getByTestId('account-code-input'), '400')
    await userEvent.type(screen.getByTestId('account-name-input'), 'Vendor')

    await userEvent.click(screen.getByTestId('has-third-parties-checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ hasThirdParties: true }),
      expect.any(Object),
    )
  })

  it('resets hasThirdParties checkbox after successful creation', async () => {
    let onSuccessCallback: ((data: any) => void) | null = null
    const createMutate = vi.fn((payload, options) => {
      onSuccessCallback = options.onSuccess
    })
    mockUseAccountMutations.mockReturnValue({
      createAccount: { mutate: createMutate, isPending: false },
      updateAccount: { ...noOpMutation },
      deleteAccount: { ...noOpMutation },
      toggleHasThirdParties: { ...noOpMutation },
    })

    const onCreated = vi.fn()
    const { rerender } = renderWithProviders(
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={onCreated} />,
    )

    const input = screen.getByTestId('has-third-parties-checkbox').querySelector('input') as HTMLInputElement
    expect(input.checked).toBe(false)

    await userEvent.type(screen.getByTestId('account-code-input'), '500')
    await userEvent.type(screen.getByTestId('account-name-input'), 'Customer')
    await userEvent.click(screen.getByTestId('has-third-parties-checkbox'))

    const checkedInput = screen.getByTestId('has-third-parties-checkbox').querySelector('input') as HTMLInputElement
    expect(checkedInput.checked).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    // Simulate successful creation
    if (onSuccessCallback) {
      onSuccessCallback({
        accountId: 'new-account-id',
        code: '500',
        name: 'Customer',
        hasThirdParties: true,
      })
    }

    // Re-render the dialog in open state to verify checkbox is reset
    rerender(
      <AccountCreationDialog workspaceId="t1" open={true} onClose={vi.fn()} onCreated={onCreated} />,
    )

    // After successful creation and reset, checkbox should be unchecked again
    const resetInput = screen.getByTestId('has-third-parties-checkbox').querySelector('input') as HTMLInputElement
    expect(resetInput.checked).toBe(false)
  })
})

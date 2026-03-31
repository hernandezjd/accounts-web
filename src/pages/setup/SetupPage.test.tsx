import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { SetupPage } from './SetupPage'

// ─── Mock all hooks ──────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useWorkspaces', () => ({ useWorkspaces: vi.fn() }))
vi.mock('@/hooks/api/useWorkspaceMutations', () => ({ useWorkspaceMutations: vi.fn() }))
vi.mock('@/hooks/api/useWorkspaceConfig', () => ({ useWorkspaceConfig: vi.fn() }))
vi.mock('@/hooks/api/useWorkspaceConfigMutations', () => ({ useWorkspaceConfigMutations: vi.fn() }))
vi.mock('@/hooks/api/useCodeStructureConfig', () => ({ useCodeStructureConfig: vi.fn() }))
vi.mock('@/hooks/api/useCodeStructureConfigMutations', () => ({ useCodeStructureConfigMutations: vi.fn() }))
vi.mock('@/hooks/api/useTransactionTypes', () => ({ useTransactionTypes: vi.fn() }))
vi.mock('@/hooks/api/useTransactionTypeMutations', () => ({ useTransactionTypeMutations: vi.fn() }))
vi.mock('@/hooks/api/useAccounts', () => ({ useAccounts: vi.fn() }))
vi.mock('./ThemeEditorTab', () => ({
  ThemeEditorTab: () => <div data-testid="theme-editor-tab">Theme Editor</div>,
}))
vi.mock('./PrefilledChartsTab', () => ({
  PrefilledChartsTab: () => <div data-testid="prefilled-charts-tab">Pre-filled Charts</div>,
}))
vi.mock('@/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}))

import { useWorkspaces } from '@/hooks/api/useWorkspaces'
import { useWorkspaceMutations } from '@/hooks/api/useWorkspaceMutations'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useWorkspaceConfigMutations } from '@/hooks/api/useWorkspaceConfigMutations'
import { useCodeStructureConfig } from '@/hooks/api/useCodeStructureConfig'
import { useCodeStructureConfigMutations } from '@/hooks/api/useCodeStructureConfigMutations'
import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useTransactionTypeMutations } from '@/hooks/api/useTransactionTypeMutations'
import { useAccounts } from '@/hooks/api/useAccounts'
import * as useAuthContextModule from '@/hooks/useAuthContext'

const mockUseWorkspaces = vi.mocked(useWorkspaces)
const mockUseWorkspaceMutations = vi.mocked(useWorkspaceMutations)
const mockUseWorkspaceConfig = vi.mocked(useWorkspaceConfig)
const mockUseWorkspaceConfigMutations = vi.mocked(useWorkspaceConfigMutations)
const mockUseCodeStructureConfig = vi.mocked(useCodeStructureConfig)
const mockUseCodeStructureConfigMutations = vi.mocked(useCodeStructureConfigMutations)
const mockUseTransactionTypes = vi.mocked(useTransactionTypes)
const mockUseTransactionTypeMutations = vi.mocked(useTransactionTypeMutations)
const mockUseAccounts = vi.mocked(useAccounts)

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleWorkspaces = [
  { id: 't-1', name: 'Acme Corp', status: 'active', contactName: 'Jane', contactEmail: 'j@acme.com', contactPhone: '' },
  { id: 't-2', name: 'Beta LLC', status: 'inactive', contactName: 'Bob', contactEmail: 'b@beta.com', contactPhone: '' },
]

const sampleConfig = {
  systemInitialDate: '2025-01-01',
  lockedPeriodDate: '2025-06-30',
  minimumAccountLevel: 3,
  snapshotFrequencyDays: 30,
  nominalAccounts: ['acc-2', 'acc-3'],
  profitLossAccountId: 'acc-4',
}

const sampleAccounts = [
  { id: 'acc-1', code: '1000', name: 'Assets', level: 1, parentCode: null, hasThirdParties: false, status: 'active' },
  { id: 'acc-2', code: '4000', name: 'Revenue', level: 2, parentCode: '4', hasThirdParties: false, status: 'active' },
  { id: 'acc-3', code: '5000', name: 'Expenses', level: 2, parentCode: '5', hasThirdParties: false, status: 'active' },
  { id: 'acc-4', code: '3000', name: 'Retained Earnings', level: 2, parentCode: '3', hasThirdParties: false, status: 'active' },
]

const sampleCodeStructure = {
  workspaceId: 't-1',
  enabled: true,
  rootCodeLength: 3,
  segmentLengthByLevel: { '2': 2, '3': 2 },
}

const sampleTransactionTypes = [
  { id: 'tt-1', name: 'Journal Entry' },
]

const noOpMutation = { mutate: vi.fn(), isPending: false }

// Default auth mock: user has manage_workspaces permission
const defaultAuthMock = {
  user: { profile: { actions: ['manage_workspaces'], workspaces: ['t-1', 't-2'] } },
  isAuthenticated: true,
  isLoading: false,
}

// ─── Setup ───────────────────────────────────────────────────────────────────

function setupMocks() {
  mockUseWorkspaces.mockReturnValue({
    data: sampleWorkspaces,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useWorkspaces>)

  mockUseWorkspaceMutations.mockReturnValue({
    createWorkspace: { ...noOpMutation },
    updateWorkspace: { ...noOpMutation },
    deactivateWorkspace: { ...noOpMutation },
    reactivateWorkspace: { ...noOpMutation },
    deleteWorkspace: { ...noOpMutation },
  })

  mockUseWorkspaceConfig.mockReturnValue({
    data: sampleConfig,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useWorkspaceConfig>)

  mockUseWorkspaceConfigMutations.mockReturnValue({
    setInitialDate: { ...noOpMutation },
    setLockedPeriodDate: { ...noOpMutation },
    setMinimumAccountLevel: { ...noOpMutation },
    setSnapshotFrequency: { ...noOpMutation },
    setNominalAccountsConfig: { ...noOpMutation },
    setClosingTransactionType: { ...noOpMutation },
  })

  mockUseCodeStructureConfig.mockReturnValue({
    data: sampleCodeStructure,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useCodeStructureConfig>)

  mockUseCodeStructureConfigMutations.mockReturnValue({
    configureCodeStructure: { ...noOpMutation },
  })

  mockUseTransactionTypes.mockReturnValue({
    data: sampleTransactionTypes,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useTransactionTypes>)

  mockUseTransactionTypeMutations.mockReturnValue({
    createTransactionType: { ...noOpMutation },
    updateTransactionType: { ...noOpMutation },
    deleteTransactionType: { ...noOpMutation },
  })

  mockUseAccounts.mockReturnValue({
    data: sampleAccounts,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useAccounts>)
}

beforeEach(() => {
  vi.clearAllMocks()
  setupMocks()
  // Mock auth context with manage_workspaces permission by default
  vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue(defaultAuthMock as any)
})

function render() {
  return renderWithProviders(<SetupPage />, {
    routerProps: { initialEntries: ['/workspaces/t-1/setup'] },
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SetupPage — tab navigation', () => {
  it('renders four tabs including Theme', () => {
    render()
    expect(screen.getByTestId('tab-workspaces')).toBeInTheDocument()
    expect(screen.getByTestId('tab-accounting-config')).toBeInTheDocument()
    expect(screen.getByTestId('tab-transaction-types')).toBeInTheDocument()
    expect(screen.getByTestId('tab-theme')).toBeInTheDocument()
  })

  it('shows Workspaces tab content by default', () => {
    render()
    expect(screen.getByTestId('workspaces-table')).toBeInTheDocument()
  })

  it('switches to Accounting Config tab', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    expect(screen.getByTestId('accounting-config-panel')).toBeInTheDocument()
  })

  it('switches to Transaction Types tab', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-transaction-types'))
    expect(screen.getByTestId('tt-table')).toBeInTheDocument()
  })

  it('switches to Theme tab', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-theme'))
    expect(screen.getByTestId('theme-editor-tab')).toBeInTheDocument()
  })
})

describe('SetupPage — Workspaces tab', () => {
  it('displays workspace list with status chips', () => {
    render()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Beta LLC')).toBeInTheDocument()
    expect(screen.getByTestId('workspace-status-t-1')).toHaveTextContent('Active')
    expect(screen.getByTestId('workspace-status-t-2')).toHaveTextContent('Inactive')
  })

  it('shows New Workspace button', () => {
    render()
    expect(screen.getByTestId('new-workspace-btn')).toBeInTheDocument()
  })

  it('opens create dialog when New Workspace is clicked', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('new-workspace-btn'))
    expect(screen.getByTestId('workspace-form-dialog')).toBeInTheDocument()
  })

  it('opens edit dialog with pre-filled data when Edit is clicked', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('edit-workspace-t-1'))
    expect(screen.getByTestId('workspace-form-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('workspace-name-input')).toHaveValue('Acme Corp')
  })

  it('calls deactivateWorkspace when Deactivate is clicked on active workspace', async () => {
    const deactivate = vi.fn()
    mockUseWorkspaceMutations.mockReturnValue({
      createWorkspace: { ...noOpMutation },
      updateWorkspace: { ...noOpMutation },
      deactivateWorkspace: { mutate: deactivate, isPending: false },
      reactivateWorkspace: { ...noOpMutation },
      deleteWorkspace: { ...noOpMutation },
    })

    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('deactivate-workspace-t-1'))
    expect(deactivate).toHaveBeenCalledWith('t-1', expect.anything())
  })

  it('calls reactivateWorkspace when Reactivate is clicked on inactive workspace', async () => {
    const reactivate = vi.fn()
    mockUseWorkspaceMutations.mockReturnValue({
      createWorkspace: { ...noOpMutation },
      updateWorkspace: { ...noOpMutation },
      deactivateWorkspace: { ...noOpMutation },
      reactivateWorkspace: { mutate: reactivate, isPending: false },
      deleteWorkspace: { ...noOpMutation },
    })

    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('reactivate-workspace-t-2'))
    expect(reactivate).toHaveBeenCalledWith('t-2', expect.anything())
  })

  it('opens delete confirm dialog when Delete is clicked', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('delete-workspace-t-1'))
    expect(screen.getByTestId('delete-workspace-dialog')).toBeInTheDocument()
  })

  it('calls deleteWorkspace when confirm delete is submitted', async () => {
    const deleteFn = vi.fn()
    mockUseWorkspaceMutations.mockReturnValue({
      createWorkspace: { ...noOpMutation },
      updateWorkspace: { ...noOpMutation },
      deactivateWorkspace: { ...noOpMutation },
      reactivateWorkspace: { ...noOpMutation },
      deleteWorkspace: { mutate: deleteFn, isPending: false },
    })

    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('delete-workspace-t-1'))
    await user.click(screen.getByTestId('confirm-delete-workspace'))
    expect(deleteFn).toHaveBeenCalledWith('t-1', expect.anything())
  })

  it('submits create workspace form', async () => {
    const createFn = vi.fn()
    mockUseWorkspaceMutations.mockReturnValue({
      createWorkspace: { mutate: createFn, isPending: false },
      updateWorkspace: { ...noOpMutation },
      deactivateWorkspace: { ...noOpMutation },
      reactivateWorkspace: { ...noOpMutation },
      deleteWorkspace: { ...noOpMutation },
    })

    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('new-workspace-btn'))
    await user.type(screen.getByTestId('workspace-name-input'), 'New Corp')
    await user.type(screen.getByTestId('workspace-contact-name-input'), 'Alice')
    await user.type(screen.getByTestId('workspace-contact-email-input'), 'alice@new.com')
    await user.type(screen.getByTestId('workspace-street-input'), '1 Main St')
    await user.type(screen.getByTestId('workspace-city-input'), 'Springfield')
    await user.type(screen.getByTestId('workspace-state-input'), 'IL')
    await user.type(screen.getByTestId('workspace-postal-input'), '62701')
    await user.type(screen.getByTestId('workspace-country-input'), 'US')
    await user.click(screen.getByTestId('workspace-form-save'))
    expect(createFn).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Corp', contactName: 'Alice', contactEmail: 'alice@new.com' }),
      expect.anything(),
    )
  })
})

describe('SetupPage — Accounting Config tab', () => {
  async function switchToConfigTab() {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    return user
  }

  it('displays current config values', async () => {
    await switchToConfigTab()
    expect(screen.getByTestId('config-initial-date-value')).toHaveTextContent('2025-01-01')
    expect(screen.getByTestId('config-locked-period-value')).toHaveTextContent('2025-06-30')
    expect(screen.getByTestId('config-min-level-value')).toHaveTextContent('3')
    expect(screen.getByTestId('config-snapshot-freq-value')).toHaveTextContent('30')
  })

  it('opens edit initial date dialog', async () => {
    const user = await switchToConfigTab()
    await user.click(screen.getByTestId('edit-initial-date-btn'))
    expect(screen.getByTestId('edit-config-dialog')).toBeInTheDocument()
  })

  it('calls setInitialDate mutation on submit', async () => {
    const setDateFn = vi.fn()
    mockUseWorkspaceConfigMutations.mockReturnValue({
      setInitialDate: { mutate: setDateFn, isPending: false },
      setLockedPeriodDate: { ...noOpMutation },
      setMinimumAccountLevel: { ...noOpMutation },
      setSnapshotFrequency: { ...noOpMutation },
      setNominalAccountsConfig: { ...noOpMutation },
      setClosingTransactionType: { ...noOpMutation },
    })

    const user = await switchToConfigTab()
    await user.click(screen.getByTestId('edit-initial-date-btn'))
    const input = screen.getByTestId('config-field-input')
    await user.clear(input)
    await user.type(input, '2024-01-01')
    await user.click(screen.getByTestId('config-save-btn'))
    expect(setDateFn).toHaveBeenCalledWith('2024-01-01', expect.anything())
  })

  it('displays code structure config', async () => {
    await switchToConfigTab()
    expect(screen.getByTestId('code-structure-panel')).toBeInTheDocument()
    expect(screen.getByTestId('code-structure-enabled')).toBeInTheDocument()
  })
})

describe('SetupPage — Transaction Types tab', () => {
  it('renders transaction types table in tab', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-transaction-types'))
    expect(screen.getByTestId('tt-table')).toBeInTheDocument()
    expect(screen.getByText('Journal Entry')).toBeInTheDocument()
  })

  it('does not show Transaction Types page h4 title in tab', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-transaction-types'))
    // Should not have the standalone h4 "Transaction Types" heading
    const h4s = screen.queryAllByRole('heading', { level: 4 })
    const ttHeading = h4s.find((el) => el.textContent === 'Transaction Types')
    expect(ttHeading).toBeUndefined()
  })
})

describe('SetupPage — loading / error states', () => {
  it('shows loading in Workspaces tab', () => {
    mockUseWorkspaces.mockReturnValue({ data: undefined, isLoading: true, isError: false } as ReturnType<typeof useWorkspaces>)
    render()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error in Workspaces tab', () => {
    mockUseWorkspaces.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error('load failed') } as ReturnType<typeof useWorkspaces>)
    render()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows loading in Accounting Config tab', async () => {
    mockUseWorkspaceConfig.mockReturnValue({ data: undefined, isLoading: true, isError: false } as ReturnType<typeof useWorkspaceConfig>)
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error in Accounting Config tab', async () => {
    const mockError = {
      userMessage: 'Failed to load config',
      errorCode: 'UNKNOWN_ERROR',
      requestId: 'req-123',
      timestamp: '2024-01-01T00:00:00Z',
      isRetryable: true,
      showSupportContact: false,
      classification: 'transient' as const,
    }
    mockUseWorkspaceConfig.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: mockError } as ReturnType<typeof useWorkspaceConfig>)
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('SetupPage — code structure edit', () => {
  it('opens code structure edit dialog', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    await user.click(screen.getByTestId('edit-code-structure-btn'))
    expect(screen.getByTestId('code-structure-dialog')).toBeInTheDocument()
  })

  it('calls configureCodeStructure on submit', async () => {
    const configureFn = vi.fn()
    mockUseCodeStructureConfigMutations.mockReturnValue({
      configureCodeStructure: { mutate: configureFn, isPending: false },
    })

    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    await user.click(screen.getByTestId('edit-code-structure-btn'))
    await user.click(screen.getByTestId('code-structure-save-btn'))
    await waitFor(() => {
      expect(configureFn).toHaveBeenCalled()
    })
  })
})

describe('SetupPage — nominal accounts configuration', () => {
  it('displays nominal accounts panel', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    expect(screen.getByTestId('nominal-accounts-panel')).toBeInTheDocument()
  })

  it('renders nominal account codes as chips', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    // Should show chips for acc-2 (4000) and acc-3 (5000)
    expect(screen.getByText('4000 — Revenue')).toBeInTheDocument()
    expect(screen.getByText('5000 — Expenses')).toBeInTheDocument()
  })

  it('renders P&L account as chip', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    // Should show chip for acc-4 (3000)
    expect(screen.getByText('3000 — Retained Earnings')).toBeInTheDocument()
  })

  it('displays "Not set" when nominal accounts not configured', async () => {
    mockUseWorkspaceConfig.mockReturnValue({
      data: { systemInitialDate: '2025-01-01', nominalAccounts: null, profitLossAccountId: null },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useWorkspaceConfig>)

    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    const notSetElements = screen.queryAllByText('Not set')
    expect(notSetElements.length).toBeGreaterThan(0)
  })

  it('opens nominal accounts edit dialog', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    await user.click(screen.getByTestId('edit-nominal-accounts-btn'))
    expect(screen.getByTestId('nominal-accounts-dialog')).toBeInTheDocument()
  })

  it('calls setNominalAccountsConfig on save', async () => {
    const saveFn = vi.fn()
    mockUseWorkspaceConfigMutations.mockReturnValue({
      setInitialDate: { ...noOpMutation },
      setLockedPeriodDate: { ...noOpMutation },
      setMinimumAccountLevel: { ...noOpMutation },
      setSnapshotFrequency: { ...noOpMutation },
      setNominalAccountsConfig: { mutate: saveFn, isPending: false },
      setClosingTransactionType: { ...noOpMutation },
    })

    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    await user.click(screen.getByTestId('edit-nominal-accounts-btn'))

    // Dialog should be open and button should be enabled
    expect(screen.getByTestId('nominal-accounts-dialog')).toBeInTheDocument()
    await user.click(screen.getByTestId('nominal-accounts-save-btn'))

    await waitFor(() => {
      expect(saveFn).toHaveBeenCalled()
    })
  })
})

describe('SetupPage — closing transaction type configuration', () => {
  async function switchToConfigTab() {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('tab-accounting-config'))
    return user
  }

  it('displays closing transaction type panel', async () => {
    await switchToConfigTab()
    expect(screen.getByTestId('closing-transaction-type-panel')).toBeInTheDocument()
  })

  it('renders closing transaction type dialog select', async () => {
    const user = await switchToConfigTab()
    // Open the dialog by clicking the edit button
    await user.click(screen.getByTestId('edit-closing-transaction-type-btn'))
    expect(screen.getByTestId('closing-transaction-type-dialog-select')).toBeInTheDocument()
  })

  it('calls setClosingTransactionType mutation when selection changes', async () => {
    const setClosingFn = vi.fn()
    mockUseWorkspaceConfigMutations.mockReturnValue({
      setInitialDate: { ...noOpMutation },
      setLockedPeriodDate: { ...noOpMutation },
      setMinimumAccountLevel: { ...noOpMutation },
      setSnapshotFrequency: { ...noOpMutation },
      setNominalAccountsConfig: { ...noOpMutation },
      setClosingTransactionType: { mutate: setClosingFn, isPending: false },
    })

    const user = await switchToConfigTab()
    // Open the dialog
    await user.click(screen.getByTestId('edit-closing-transaction-type-btn'))
    // MUI Select: click the role=combobox element to open dropdown
    const select = screen.getByTestId('closing-transaction-type-dialog-select')
    const combobox = select.querySelector('[role="combobox"]') ?? select
    await user.click(combobox)
    // Click the "Journal Entry" option in the dropdown listbox
    const option = await screen.findByRole('option', { name: 'Journal Entry' })
    await user.click(option)
    // Click save button
    await user.click(screen.getByTestId('closing-transaction-type-save-btn'))

    expect(setClosingFn).toHaveBeenCalledWith('tt-1', expect.anything())
  })
})

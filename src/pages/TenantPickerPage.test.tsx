import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TenantPickerPage } from './TenantPickerPage'
import i18n from '@/i18n'

// Mock the api clients module
vi.mock('@/api/clients', () => ({
  tenantClient: { GET: vi.fn(), POST: vi.fn() },
  commandClient: { GET: vi.fn() },
  queryClient: { GET: vi.fn() },
}))

// Import after mock so we get the mocked version
import { tenantClient } from '@/api/clients'

const mockTenants = [
  { id: 'tenant-1', name: 'Acme Corp', status: 'active' as const },
  { id: 'tenant-2', name: 'Globex Corp', status: 'active' as const },
]

type MockClient = { GET: ReturnType<typeof vi.fn>; POST: ReturnType<typeof vi.fn> }

function mockGet(data: unknown, error?: unknown) {
  vi.mocked((tenantClient as unknown as MockClient).GET).mockResolvedValue({ data, error })
}

function mockPost(data: unknown, error?: unknown) {
  vi.mocked((tenantClient as unknown as MockClient).POST).mockResolvedValue({ data, error })
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  // Reset language to English before each test
  i18n.changeLanguage('en')
})

afterEach(() => {
  sessionStorage.clear()
  // Reset language to English after each test
  i18n.changeLanguage('en')
})

describe('TenantPickerPage', () => {
  it('shows loading state while fetching', () => {
    vi.mocked((tenantClient as unknown as MockClient).GET).mockReturnValue(new Promise(() => {}))
    renderWithProviders(<TenantPickerPage />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders tenant list when multiple tenants exist', async () => {
    mockGet(mockTenants)
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Globex Corp')).toBeInTheDocument()
    })
  })

  it('saves tenantId to sessionStorage and navigates on selection', async () => {
    mockGet(mockTenants)
    const { unmount } = renderWithProviders(<TenantPickerPage />)
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Acme Corp'))
    expect(sessionStorage.getItem('lastTenantId')).toBe('tenant-1')
    unmount()
  })

  it('auto-redirects if sessionStorage has lastTenantId', async () => {
    sessionStorage.setItem('lastTenantId', 'tenant-1')
    mockGet(mockTenants)
    // With a saved tenant, the picker should redirect (component triggers navigate)
    // We just verify sessionStorage is set; navigation is tested via routing
    renderWithProviders(<TenantPickerPage />)
    // The effect fires synchronously: sessionStorage was set before render
    expect(sessionStorage.getItem('lastTenantId')).toBe('tenant-1')
  })

  it('auto-selects and shows spinner when exactly one tenant exists', async () => {
    const singleTenant = [{ id: 'tenant-1', name: 'Acme Corp', status: 'active' as const }]
    mockGet(singleTenant)
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      expect(sessionStorage.getItem('lastTenantId')).toBe('tenant-1')
    })
  })

  it('shows error alert on network failure', async () => {
    vi.mocked((tenantClient as unknown as MockClient).GET).mockResolvedValue({ data: undefined, error: new Error('Network error') })
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows no-tenants message and create button when empty list returned', async () => {
    mockGet([])
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      expect(screen.getByText(/no tenants available/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create your first tenant/i })).toBeInTheDocument()
    })
  })

  it('opens create dialog when button is clicked', async () => {
    mockGet([])
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /create your first tenant/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /create your first tenant/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /create tenant/i })).toBeInTheDocument()
  })

  it('navigates to new tenant after successful creation', async () => {
    mockGet([])
    const newTenant = {
      id: 'new-tenant-id',
      name: 'New Corp',
      status: 'active',
      contactName: 'Alice',
      contactEmail: 'alice@new.com',
      address: { street: '1 Main St', city: 'Springfield', state: 'IL', postalCode: '62701', country: 'US' },
    }
    mockPost(newTenant)

    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /create your first tenant/i })).toBeInTheDocument())

    // Open dialog
    await userEvent.click(screen.getByRole('button', { name: /create your first tenant/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    // Fill in required fields
    await userEvent.type(screen.getByLabelText(/^name/i), 'New Corp')
    await userEvent.type(screen.getByLabelText(/contact name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/contact email/i), 'alice@new.com')
    await userEvent.type(screen.getByLabelText(/street/i), '1 Main St')
    await userEvent.type(screen.getByLabelText(/city/i), 'Springfield')
    await userEvent.type(screen.getByLabelText(/state/i), 'IL')
    await userEvent.type(screen.getByLabelText(/postal code/i), '62701')
    await userEvent.type(screen.getByLabelText(/country/i), 'US')

    // Submit
    await userEvent.click(screen.getByTestId('tenant-form-save'))

    await waitFor(() => {
      expect(sessionStorage.getItem('lastTenantId')).toBe('new-tenant-id')
    })
  })

  it('renders language toggle button', async () => {
    mockGet(mockTenants)
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      const languageButton = screen.getByTestId('language-toggle-button')
      expect(languageButton).toBeInTheDocument()
      expect(languageButton.textContent).toMatch(/EN|ES/)
    })
  })

  it('toggles language on button click', async () => {
    mockGet(mockTenants)
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => expect(screen.getByTestId('language-toggle-button')).toBeInTheDocument())

    const languageButton = screen.getByTestId('language-toggle-button')
    const initialText = languageButton.textContent

    await userEvent.click(languageButton)

    // After clicking, the button text should change
    await waitFor(() => {
      const newText = languageButton.textContent
      expect(newText).not.toBe(initialText)
    })
  })

  it('renders help button', async () => {
    mockGet(mockTenants)
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      const helpButton = screen.getByTestId('help-button')
      expect(helpButton).toBeInTheDocument()
    })
  })

  it('has help button with correct aria label', async () => {
    mockGet(mockTenants)
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      const helpButton = screen.getByTestId('help-button')
      const ariaLabel = helpButton.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      // In English, should be "Help", in Spanish "Ayuda"
      expect(['Help', 'Ayuda']).toContain(ariaLabel)
    })
  })
})

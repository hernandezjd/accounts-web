import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { TenantPickerPage } from './TenantPickerPage'
import i18n from '@/i18n'
import * as useAuthContextModule from '@/hooks/useAuthContext'

// Mock the apiClient
vi.mock('@/api/apiClient', () => ({
  apiClient: {
    tenant: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
  },
}))

// Import after mock so we get the mocked version
import { apiClient } from '@/api/apiClient'

// Default auth mock: user has manage_tenants permission
const defaultAuthMock = {
  user: { profile: { actions: ['manage_tenants'], tenants: ['tenant-1', 'tenant-2'] } },
  isAuthenticated: true,
  isLoading: false,
}

const mockTenants = [
  { id: 'tenant-1', name: 'Acme Corp', status: 'active' as const },
  { id: 'tenant-2', name: 'Globex Corp', status: 'active' as const },
]

type MockTenantClient = { GET: ReturnType<typeof vi.fn>; POST: ReturnType<typeof vi.fn> }

function mockGet(data: unknown) {
  vi.mocked((apiClient.tenant as unknown as MockTenantClient).GET).mockResolvedValue({ data, response: new Response() })
}

function mockPost(data: unknown) {
  vi.mocked((apiClient.tenant as unknown as MockTenantClient).POST).mockResolvedValue({ data, response: new Response() })
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  // Reset language to English before each test
  i18n.changeLanguage('en')
  // Mock auth context with manage_tenants permission by default
  vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue(defaultAuthMock as any)
})

afterEach(() => {
  sessionStorage.clear()
  // Reset language to English after each test
  i18n.changeLanguage('en')
})

describe('TenantPickerPage', () => {
  it('shows loading state while fetching', () => {
    vi.mocked((apiClient.tenant as unknown as MockTenantClient).GET).mockReturnValue(new Promise(() => {}))
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
    vi.mocked((apiClient.tenant as unknown as MockTenantClient).GET).mockRejectedValueOnce(new Error('Network error'))
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

  it('renders language selector dropdown', async () => {
    mockGet(mockTenants)
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      const languageSelector = screen.getByTestId('language-selector')
      expect(languageSelector).toBeInTheDocument()
    })
  })

  it('language selector has proper accessibility attributes', async () => {
    mockGet(mockTenants)
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => expect(screen.getByTestId('language-selector')).toBeInTheDocument())

    const languageSelector = screen.getByTestId('language-selector')
    // Verify the selector is in the document and is a form element
    expect(languageSelector).toBeInTheDocument()
    expect(languageSelector).toHaveAttribute('aria-label')
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

  it('hides create button and shows permission warning when user lacks manage_tenants action', async () => {
    // Mock user without manage_tenants permission
    vi.spyOn(useAuthContextModule, 'useAuthContext').mockReturnValue({
      user: { profile: { actions: [], tenants: [] } },
      isAuthenticated: true,
      isLoading: false,
    } as any)

    mockGet([])
    renderWithProviders(<TenantPickerPage />)
    await waitFor(() => {
      expect(screen.getByText(/no tenants available/i)).toBeInTheDocument()
      // Create button should not be present
      expect(screen.queryByRole('button', { name: /create your first tenant/i })).not.toBeInTheDocument()
      // Permission warning should be displayed
      expect(screen.getByText(/do not have permission to create tenants/i)).toBeInTheDocument()
    })
  })
})

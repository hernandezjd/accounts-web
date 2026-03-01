import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { ThirdPartiesPage } from './ThirdPartiesPage'
import type { ThirdParty } from '@/hooks/api/useAllThirdParties'

// ─── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock('@/hooks/api/useAllThirdParties', () => ({
  useAllThirdParties: vi.fn(),
}))
vi.mock('@/hooks/api/useThirdPartyMutations', () => ({
  useThirdPartyMutations: vi.fn(),
}))

import { useAllThirdParties } from '@/hooks/api/useAllThirdParties'
import { useThirdPartyMutations } from '@/hooks/api/useThirdPartyMutations'

const mockUseAllThirdParties = vi.mocked(useAllThirdParties)
const mockUseThirdPartyMutations = vi.mocked(useThirdPartyMutations)

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleThirdParties: ThirdParty[] = [
  {
    id: 'tp-1',
    externalId: 'EXT-001',
    name: 'Acme Corp',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'US',
    },
    phoneNumbers: [],
  },
  {
    id: 'tp-2',
    externalId: 'EXT-002',
    name: 'Beta LLC',
    address: {
      street: '456 Oak Ave',
      city: 'Shelbyville',
      state: 'IL',
      postalCode: '62565',
      country: 'US',
    },
    phoneNumbers: [],
  },
]

const noOpMutation = { mutate: vi.fn(), isPending: false }

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  mockUseAllThirdParties.mockReturnValue({
    data: sampleThirdParties,
    isLoading: false,
    isError: false,
    error: null,
  } as ReturnType<typeof useAllThirdParties>)

  mockUseThirdPartyMutations.mockReturnValue({
    createThirdParty: { ...noOpMutation },
    updateThirdParty: { ...noOpMutation },
    deleteThirdParty: { ...noOpMutation },
  })
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ThirdPartiesPage', () => {
  it('renders table headers', () => {
    renderWithProviders(<ThirdPartiesPage />)

    expect(screen.getByText('External ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('City')).toBeInTheDocument()
    expect(screen.getByText('Country')).toBeInTheDocument()
  })

  it('renders third party rows', () => {
    renderWithProviders(<ThirdPartiesPage />)

    expect(screen.getByText('EXT-001')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('EXT-002')).toBeInTheDocument()
    expect(screen.getByText('Beta LLC')).toBeInTheDocument()
  })

  it('"New Third Party" button opens create dialog', async () => {
    renderWithProviders(<ThirdPartiesPage />)

    await userEvent.click(screen.getByTestId('new-tp-btn'))

    await waitFor(() => {
      // Check for the External ID input that only appears inside the dialog
      expect(screen.getByTestId('tp-external-id-input')).toBeInTheDocument()
    })
  })

  it('Edit button opens dialog with pre-populated data', async () => {
    renderWithProviders(<ThirdPartiesPage />)

    await userEvent.click(screen.getByTestId('edit-tp-tp-1'))

    await waitFor(() => {
      expect(screen.getByText('Edit Third Party')).toBeInTheDocument()
      expect(screen.getByDisplayValue('EXT-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
    })
  })

  it('Delete button opens confirmation dialog', async () => {
    renderWithProviders(<ThirdPartiesPage />)

    await userEvent.click(screen.getByTestId('delete-tp-tp-1'))

    await waitFor(() => {
      expect(screen.getByText(/are you sure.*delete this third party/i)).toBeInTheDocument()
    })
  })

  it('confirming delete calls deleteThirdParty mutation', async () => {
    const deleteMutate = vi.fn()
    mockUseThirdPartyMutations.mockReturnValue({
      createThirdParty: { ...noOpMutation },
      updateThirdParty: { ...noOpMutation },
      deleteThirdParty: { ...noOpMutation, mutate: deleteMutate },
    })

    renderWithProviders(<ThirdPartiesPage />)

    await userEvent.click(screen.getByTestId('delete-tp-tp-1'))
    await waitFor(() => screen.getByTestId('confirm-delete-tp'))
    await userEvent.click(screen.getByTestId('confirm-delete-tp'))

    expect(deleteMutate).toHaveBeenCalledWith('tp-1', expect.any(Object))
  })

  it('shows friendly message on 409 delete error', async () => {
    const deleteMutate = vi.fn((_id, opts) => {
      opts.onError(new Error('409 Conflict'))
    })
    mockUseThirdPartyMutations.mockReturnValue({
      createThirdParty: { ...noOpMutation },
      updateThirdParty: { ...noOpMutation },
      deleteThirdParty: { ...noOpMutation, mutate: deleteMutate },
    })

    renderWithProviders(<ThirdPartiesPage />)

    await userEvent.click(screen.getByTestId('delete-tp-tp-1'))
    await waitFor(() => screen.getByTestId('confirm-delete-tp'))
    await userEvent.click(screen.getByTestId('confirm-delete-tp'))

    await waitFor(() => {
      expect(
        screen.getByText(/has transactions or balances and cannot be deleted/i),
      ).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching', () => {
    mockUseAllThirdParties.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useAllThirdParties>)

    renderWithProviders(<ThirdPartiesPage />)

    expect(screen.getByText(/loading third parties/i)).toBeInTheDocument()
  })

  it('shows empty state when no third parties', () => {
    mockUseAllThirdParties.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAllThirdParties>)

    renderWithProviders(<ThirdPartiesPage />)

    expect(screen.getByText(/no third parties found/i)).toBeInTheDocument()
  })
})

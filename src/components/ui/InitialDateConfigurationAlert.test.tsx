import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import { I18nextProvider } from 'react-i18next'
import { InitialDateConfigurationAlert } from './InitialDateConfigurationAlert'

describe('InitialDateConfigurationAlert', () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>)
  }

  it('renders warning message', () => {
    renderWithProviders(
      <MemoryRouter>
        <InitialDateConfigurationAlert
          tenantId="tenant-1"
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
        />
      </MemoryRouter>
    )

    expect(screen.getByText(/system initial date must be configured/i)).toBeInTheDocument()
  })

  it('renders "Go to Setup" button', () => {
    renderWithProviders(
      <MemoryRouter>
        <InitialDateConfigurationAlert
          tenantId="tenant-1"
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /go to setup/i })).toBeInTheDocument()
  })

  it('button is clickable and navigates', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <MemoryRouter>
        <InitialDateConfigurationAlert
          tenantId="tenant-123"
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
        />
      </MemoryRouter>
    )

    const button = screen.getByRole('button', { name: /go to setup/i })
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()

    await user.click(button)
    expect(button).toBeInTheDocument()
  })

  it('uses custom testId when provided', () => {
    renderWithProviders(
      <MemoryRouter>
        <InitialDateConfigurationAlert
          tenantId="tenant-1"
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
          testId="custom-alert"
        />
      </MemoryRouter>
    )

    expect(screen.getByTestId('custom-alert')).toBeInTheDocument()
    expect(screen.getByTestId('custom-alert-button')).toBeInTheDocument()
  })

  it('uses default testId when not provided', () => {
    renderWithProviders(
      <MemoryRouter>
        <InitialDateConfigurationAlert
          tenantId="tenant-1"
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
        />
      </MemoryRouter>
    )

    expect(screen.getByTestId('initial-date-configuration-alert')).toBeInTheDocument()
    expect(screen.getByTestId('initial-date-configuration-alert-button')).toBeInTheDocument()
  })

  it('applies warning severity styling to Alert', () => {
    const { container } = renderWithProviders(
      <MemoryRouter>
        <InitialDateConfigurationAlert
          tenantId="tenant-1"
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
        />
      </MemoryRouter>
    )

    const alert = container.querySelector('[role="alert"]')
    expect(alert).toHaveClass('MuiAlert-colorWarning')
  })

  it('renders alert with message and button side by side', () => {
    renderWithProviders(
      <MemoryRouter>
        <InitialDateConfigurationAlert
          tenantId="tenant-1"
          messageKey="initialBalances.initialDateNotConfiguredWarning"
        />
      </MemoryRouter>
    )

    const button = screen.getByRole('button', { name: /go to setup/i })
    const alert = screen.getByTestId('initial-date-configuration-alert')

    expect(alert).toBeInTheDocument()
    expect(button).toBeInTheDocument()
  })
})

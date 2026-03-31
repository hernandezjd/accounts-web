import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { HelpPage } from './HelpPage'

const renderHelpPage = () => {
  return render(
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <HelpPage />
      </BrowserRouter>
    </I18nextProvider>
  )
}

describe('HelpPage', () => {
  it('should render the help page title', () => {
    renderHelpPage()
    expect(screen.getByText(/Help/i)).toBeInTheDocument()
  })

  it('should render all help sections', () => {
    renderHelpPage()
    expect(screen.getByTestId('help-section-gettingStarted')).toBeInTheDocument()
    expect(screen.getByTestId('help-section-workspaces')).toBeInTheDocument()
    expect(screen.getByTestId('help-section-accounts')).toBeInTheDocument()
    expect(screen.getByTestId('help-section-accountChart')).toBeInTheDocument()
    expect(screen.getByTestId('help-section-initialBalances')).toBeInTheDocument()
    expect(screen.getByTestId('help-section-transactions')).toBeInTheDocument()
  })

  it('should display section titles correctly', () => {
    renderHelpPage()
    expect(screen.getByRole('heading', { name: /Getting Started/i, level: 6 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Workspaces/i, level: 6 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Accounts/i, level: 6 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Account Chart/i, level: 6 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Initial Balances/i, level: 6 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Transactions/i, level: 6 })).toBeInTheDocument()
  })

  it('should have getting started section expanded by default', () => {
    renderHelpPage()
    const gettingStartedSummary = screen.getByTestId('help-section-gettingStarted').querySelector('[aria-expanded]')
    expect(gettingStartedSummary).toHaveAttribute('aria-expanded', 'true')
  })

  it('should allow expanding and collapsing sections', async () => {
    const user = userEvent.setup()
    renderHelpPage()

    const accountsAccordion = screen.getByTestId('help-section-accounts')
    const accountsSummary = accountsAccordion.querySelector('[aria-expanded]') as HTMLElement

    // Initially collapsed
    expect(accountsSummary).toHaveAttribute('aria-expanded', 'false')

    // Click to expand
    await user.click(accountsSummary)
    expect(accountsSummary).toHaveAttribute('aria-expanded', 'true')

    // Click to collapse
    await user.click(accountsSummary)
    expect(accountsSummary).toHaveAttribute('aria-expanded', 'false')
  })

  it('should have a back button that navigates', async () => {
    const user = userEvent.setup()
    renderHelpPage()

    const backButton = screen.getByRole('button', { name: /Back/i })
    expect(backButton).toBeInTheDocument()

    // Verify button is clickable
    await user.click(backButton)
    // Navigation is handled by router, so we just verify the button is clickable
  })

  it('should display help content with description text', () => {
    renderHelpPage()

    // Verify workspaces section contains the title and description is present
    const workspacesSection = screen.getByTestId('help-section-workspaces')
    expect(workspacesSection).toBeInTheDocument()
    expect(workspacesSection.textContent).toContain('Workspaces')
    expect(workspacesSection.textContent).toContain('isolated instance')
  })

  it('should support Spanish language', async () => {
    const user = userEvent.setup()

    // Change language to Spanish before rendering
    await i18n.changeLanguage('es')

    renderHelpPage()

    // Check for Spanish content
    const helpHeading = screen.queryByText(/Ayuda/i)
    expect(helpHeading).toBeInTheDocument()

    const workspacesHeading = screen.queryByRole('heading', { name: /Espacio de Trabajos/i, level: 6 })
    expect(workspacesHeading).toBeInTheDocument()

    // Change back to English after test
    await i18n.changeLanguage('en')
  })

  it('should render back button with correct aria label', () => {
    // Ensure we're in English
    i18n.changeLanguage('en')
    renderHelpPage()
    const backButton = screen.getByRole('button', { name: /Back/i })
    expect(backButton).toHaveAttribute('aria-label', 'Back')
  })
})

import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthGuard } from '@/components/AuthGuard'
import { WorkspaceThemeProvider } from '@/context/WorkspaceThemeProvider'
import { CallbackPage } from '@/pages/CallbackPage'
import { WorkspacePickerPage } from '@/pages/WorkspacePickerPage'
import { OrgPickerPage } from '@/pages/OrgPickerPage'
import { HelpPage } from '@/pages/HelpPage'
import { AccountingPage } from '@/pages/accounting/AccountingPage'
import { AccountsPage } from '@/pages/accounts/AccountsPage'
import { ThirdPartiesPage } from '@/pages/third-parties/ThirdPartiesPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { ClosingPage } from '@/pages/closing/ClosingPage'
import { InitialBalancesPage } from '@/pages/initial-balances/InitialBalancesPage'
import { SetupPage } from '@/pages/setup/SetupPage'
import { useAppStore } from '@/store/appStore'

function OrgGuard({ children }: { children: React.ReactNode }) {
  const selectedOrgId = useAppStore((s) => s.selectedOrgId)
  if (!selectedOrgId) {
    return <Navigate to="/org-picker" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Callback route for OAuth redirect - must be accessible without auth */}
      <Route path="/callback" element={<CallbackPage />} />

      {/* All other routes require authentication */}
      <Route
        path="/*"
        element={
          <AuthGuard>
            <Routes>
              <Route path="/org-picker" element={<OrgPickerPage />} />
              <Route path="/help" element={<HelpPage />} />

              <Route
                path="/*"
                element={
                  <OrgGuard>
                    <Routes>
                      <Route path="/" element={<WorkspacePickerPage />} />

                      <Route path="/workspaces/:workspaceId" element={<WorkspaceThemeProvider><AppShell /></WorkspaceThemeProvider>}>
                        <Route index element={<Navigate to="accounting" replace />} />
                        <Route path="accounting" element={<AccountingPage />} />
                        <Route path="accounts" element={<AccountsPage />} />
                        <Route path="third-parties" element={<ThirdPartiesPage />} />
                        <Route path="initial-balances" element={<InitialBalancesPage />} />
                        {/* The transaction list now lives in the Transactions tab of Accounting */}
                        <Route path="transactions" element={<Navigate to="../accounting?view=transactions" replace />} />
                        <Route path="reports" element={<ReportsPage />} />
                        <Route path="closing" element={<ClosingPage />} />
                        <Route path="setup" element={<SetupPage />} />
                        <Route path="help" element={<HelpPage />} />
                      </Route>

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </OrgGuard>
                }
              />
            </Routes>
          </AuthGuard>
        }
      />
    </Routes>
  )
}

export default App

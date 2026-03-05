import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { TenantThemeProvider } from '@/context/TenantThemeProvider'
import { TenantPickerPage } from '@/pages/TenantPickerPage'
import { AccountingPage } from '@/pages/accounting/AccountingPage'
import { AccountsPage } from '@/pages/accounts/AccountsPage'
import { ThirdPartiesPage } from '@/pages/third-parties/ThirdPartiesPage'
import { TransactionsPage } from '@/pages/transactions/TransactionsPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SetupPage } from '@/pages/setup/SetupPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<TenantPickerPage />} />

      <Route path="/tenants/:tenantId" element={<TenantThemeProvider><AppShell /></TenantThemeProvider>}>
        <Route index element={<Navigate to="accounting" replace />} />
        <Route path="accounting" element={<AccountingPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="third-parties" element={<ThirdPartiesPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="setup" element={<SetupPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

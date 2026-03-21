import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PeopleIcon from '@mui/icons-material/People'
import ReceiptIcon from '@mui/icons-material/Receipt'
import BarChartIcon from '@mui/icons-material/BarChart'
import ArchiveIcon from '@mui/icons-material/Archive'
import SettingsIcon from '@mui/icons-material/Settings'
import { NavLink, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface NavItem {
  key: string
  labelKey: string
  icon: React.ReactElement
  path: string
}

function useNavItems(): NavItem[] {
  const { tenantId } = useParams<{ tenantId: string }>()
  const base = `/tenants/${tenantId ?? ''}`
  return [
    { key: 'accounting', labelKey: 'nav.accounting', icon: <AccountBalanceIcon />, path: `${base}/accounting` },
    { key: 'accounts', labelKey: 'nav.accounts', icon: <AccountTreeIcon />, path: `${base}/accounts` },
    { key: 'thirdParties', labelKey: 'nav.thirdParties', icon: <PeopleIcon />, path: `${base}/third-parties` },
    { key: 'initialBalances', labelKey: 'nav.initialBalances', icon: <AccountBalanceWalletIcon />, path: `${base}/initial-balances` },
    { key: 'transactions', labelKey: 'nav.transactions', icon: <ReceiptIcon />, path: `${base}/transactions` },
    { key: 'reports', labelKey: 'nav.reports', icon: <BarChartIcon />, path: `${base}/reports` },
    { key: 'closing', labelKey: 'nav.closing', icon: <ArchiveIcon />, path: `${base}/closing` },
    { key: 'setup', labelKey: 'nav.setup', icon: <SettingsIcon />, path: `${base}/setup` },
  ]
}

const DRAWER_WIDTH = 220

export function SideNav() {
  const { t } = useTranslation()
  const navItems = useNavItems()

  return (
    <List sx={{ width: DRAWER_WIDTH, pt: 1 }} aria-label="navigation">
      {navItems.map((item, index) => (
        <span key={item.key}>
          {index === 7 && <Divider sx={{ my: 0.5 }} />}
          <NavLink
            to={item.path}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {({ isActive }) => (
              <ListItemButton
                selected={isActive}
                sx={{
                  borderRadius: 1,
                  mx: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={t(item.labelKey)} />
              </ListItemButton>
            )}
          </NavLink>
        </span>
      ))}
    </List>
  )
}

import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import MenuIcon from '@mui/icons-material/Menu'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '@/hooks/api/useTenant'
import { useTenants } from '@/hooks/api/useTenants'
import { useAppStore } from '@/store/appStore'
import { clearAllPreferences } from '@/utils/preferences'

interface AppHeaderProps {
  onMenuToggle: () => void
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenantId } = useParams<{ tenantId: string }>()
  const { data: tenant } = useTenant(tenantId)
  const { data: tenants } = useTenants()
  const { language, setLanguage } = useAppStore()

  function handleSwitchTenant() {
    sessionStorage.removeItem('lastTenantId')
    // Clear UI preferences to avoid cross-tenant leakage
    clearAllPreferences()
    navigate('/')
  }

  function handleToggleLanguage() {
    setLanguage(language === 'en' ? 'es' : 'en')
  }

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="toggle navigation"
          edge="start"
          onClick={onMenuToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 3 }}>
          Accounts
        </Typography>

        {tenant && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography variant="body1" fontWeight="medium" data-testid="active-tenant-name">
              {tenant.name}
            </Typography>
          </Box>
        )}
        {!tenant && <Box sx={{ flexGrow: 1 }} />}

        <Button
          color="inherit"
          size="small"
          onClick={handleToggleLanguage}
          sx={{ mr: 1, minWidth: 40 }}
          aria-label="toggle language"
        >
          {language === 'en' ? 'ES' : 'EN'}
        </Button>

        {tenants && tenants.length > 1 && (
          <Button
            color="inherit"
            size="small"
            startIcon={<SwapHorizIcon />}
            onClick={handleSwitchTenant}
            data-testid="switch-tenant-button"
          >
            {t('tenant.switchTenant')}
          </Button>
        )}
      </Toolbar>
    </AppBar>
  )
}

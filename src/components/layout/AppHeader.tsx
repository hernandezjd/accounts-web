import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import MenuIcon from '@mui/icons-material/Menu'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
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

  function handleLanguageChange(newLanguage: string) {
    setLanguage(newLanguage)
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
          startIcon={<HelpOutlineIcon />}
          onClick={() => navigate('help')}
          aria-label={t('help.title')}
          sx={{ mr: 1 }}
          data-testid="help-button"
        >
          {t('help.title')}
        </Button>

        <Select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          size="small"
          sx={{
            color: 'inherit',
            mr: 1,
            minWidth: 80,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.87)',
            },
          }}
          aria-label={t('language.select')}
          data-testid="language-selector"
        >
          <MenuItem value="en">{t('language.english')}</MenuItem>
          <MenuItem value="es">{t('language.spanish')}</MenuItem>
          <MenuItem value="uk">{t('language.ukrainian')}</MenuItem>
          <MenuItem value="fr">{t('language.french')}</MenuItem>
        </Select>

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

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { useTenants } from '@/hooks/api/useTenants'
import { useAppStore } from '@/store/appStore'
import { useUserActions } from '@/hooks/useUserActions'
import { TenantFormDialog } from './TenantFormDialog'

function tenantAccountingPath(id: string): string {
  return `/tenants/${id}/accounting`
}

export function TenantPickerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: tenants, isLoading, isError, error } = useTenants()
  const [createOpen, setCreateOpen] = useState(false)
  const { language, setLanguage } = useAppStore()
  const { hasAction } = useUserActions()
  const canManageTenants = hasAction('manage_tenants')

  function handleLanguageChange(newLanguage: string) {
    setLanguage(newLanguage)
  }

  function handleHelpClick() {
    navigate('/help')
  }

  // Auto-redirect: check sessionStorage first
  useEffect(() => {
    const lastTenantId = sessionStorage.getItem('lastTenantId')
    if (lastTenantId) {
      navigate(tenantAccountingPath(lastTenantId), { replace: true })
    }
  }, [navigate])

  // Auto-select when exactly one tenant
  useEffect(() => {
    if (tenants && tenants.length === 1) {
      const id = tenants[0].id
      sessionStorage.setItem('lastTenantId', id)
      navigate(tenantAccountingPath(id), { replace: true })
    }
  }, [tenants, navigate])

  function handleSelect(id: string) {
    sessionStorage.setItem('lastTenantId', id)
    navigate(tenantAccountingPath(id))
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper elevation={3} sx={{ width: '100%', maxWidth: 480, p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ flex: 1 }}>
            {t('tenant.tenantPicker')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              size="small"
              sx={{
                color: 'inherit',
                minWidth: 80,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.4)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.87)',
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
            <Button
              color="inherit"
              size="small"
              startIcon={<HelpOutlineIcon />}
              onClick={handleHelpClick}
              aria-label={t('help.title')}
              data-testid="help-button"
            >
              {t('help.title')}
            </Button>
          </Box>
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress aria-label={t('common.loading')} />
          </Box>
        )}

        {isError && <ErrorMessage error={error ?? null} />}

        {tenants && tenants.length === 0 && (
          <>
            <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
              {t('tenant.noTenants')}
            </Typography>
            {canManageTenants ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button variant="contained" onClick={() => setCreateOpen(true)}>
                  {t('tenant.createFirstTenant')}
                </Button>
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mt: 3 }}>
                {t('tenant.insufficientPermissionsCreate')}
              </Alert>
            )}
            <TenantFormDialog
              open={createOpen}
              onClose={() => setCreateOpen(false)}
              onCreated={(id) => {
                sessionStorage.setItem('lastTenantId', id)
                navigate(tenantAccountingPath(id))
              }}
            />
          </>
        )}

        {tenants && tenants.length > 1 && (
          <List>
            {tenants.map((tenant) => (
              <ListItemButton
                key={tenant.id}
                onClick={() => handleSelect(tenant.id)}
                disabled={tenant.status === 'inactive'}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText
                  primary={tenant.name}
                  secondary={tenant.status === 'inactive' ? '(inactive)' : undefined}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {tenants && tenants.length === 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>{t('tenant.autoSelecting')}</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

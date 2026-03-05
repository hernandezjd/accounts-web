import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import { useTranslation } from 'react-i18next'
import { useTenants } from '@/hooks/api/useTenants'
import { TenantFormDialog } from './TenantFormDialog'

function tenantAccountingPath(id: string): string {
  return `/tenants/${id}/accounting`
}

export function TenantPickerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: tenants, isLoading, isError } = useTenants()
  const [createOpen, setCreateOpen] = useState(false)

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
        <Typography variant="h5" gutterBottom align="center">
          {t('tenant.tenantPicker')}
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress aria-label={t('common.loading')} />
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('errors.networkError')}
          </Alert>
        )}

        {tenants && tenants.length === 0 && (
          <>
            <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
              {t('tenant.noTenants')}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button variant="contained" onClick={() => setCreateOpen(true)}>
                {t('tenant.createFirstTenant')}
              </Button>
            </Box>
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

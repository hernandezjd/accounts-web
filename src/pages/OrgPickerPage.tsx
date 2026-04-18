import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { useOrganizations } from '@/hooks/api/useOrganizations'
import { useAppStore } from '@/store/appStore'

export function OrgPickerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: organizations, isLoading, isError, error } = useOrganizations()
  const setSelectedOrgId = useAppStore((s) => s.setSelectedOrgId)

  // Auto-select when exactly one organization
  useEffect(() => {
    if (organizations && organizations.length === 1 && organizations[0].id) {
      setSelectedOrgId(organizations[0].id)
      navigate('/', { replace: true })
    }
  }, [organizations, setSelectedOrgId, navigate])

  function handleSelect(id: string) {
    setSelectedOrgId(id)
    navigate('/')
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
        <Typography variant="h5" sx={{ mb: 3 }} data-testid="org-picker-title">
          {t('organization.orgPicker')}
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress aria-label={t('common.loading')} />
          </Box>
        )}

        {isError && <ErrorMessage error={error ?? null} />}

        {organizations && organizations.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ mt: 2 }} data-testid="no-orgs-message">
            {t('organization.noOrganizations')}
          </Typography>
        )}

        {organizations && organizations.length === 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>{t('organization.autoSelecting')}</Typography>
          </Box>
        )}

        {organizations && organizations.length > 1 && (
          <List data-testid="org-list">
            {organizations.map((org) => (
              <ListItemButton
                key={org.id}
                onClick={() => handleSelect(org.id!)}
                sx={{ borderRadius: 1, mb: 0.5 }}
                data-testid={`org-item-${org.id}`}
              >
                <ListItemText primary={org.name} secondary={org.contactEmail} />
              </ListItemButton>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  )
}

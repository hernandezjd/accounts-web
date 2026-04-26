import { useEffect, useMemo, useState } from 'react'
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
import { useWorkspaces } from '@/hooks/api/useWorkspaces'
import { useAppStore } from '@/store/appStore'
import { useUserActions } from '@/hooks/useUserActions'
import { WorkspaceFormDialog } from './WorkspaceFormDialog'

function workspaceAccountingPath(id: string): string {
  return `/workspaces/${id}/accounting`
}

export function WorkspacePickerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: allWorkspaces, isLoading, isError, error } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)
  const { language, setLanguage, selectedOrgId } = useAppStore()

  const { clearSelectedOrgId } = useAppStore()

  const workspaces = useMemo(() => {
    if (!allWorkspaces) return allWorkspaces
    if (!selectedOrgId) return allWorkspaces
    const filtered = allWorkspaces.filter((w) => w.organizationId === selectedOrgId)
    return filtered
  }, [allWorkspaces, selectedOrgId])

  // Clear stale org selection when it matches no workspaces
  useEffect(() => {
    if (allWorkspaces && allWorkspaces.length > 0 && workspaces && workspaces.length === 0 && selectedOrgId) {
      clearSelectedOrgId()
    }
  }, [allWorkspaces, workspaces, selectedOrgId, clearSelectedOrgId])
  const { hasAction } = useUserActions()
  const canManageWorkspaces = hasAction('manage_workspaces')

  function handleLanguageChange(newLanguage: string) {
    setLanguage(newLanguage)
  }

  function handleHelpClick() {
    navigate('/help')
  }

  // Auto-redirect: check sessionStorage first
  useEffect(() => {
    const lastWorkspaceId = sessionStorage.getItem('lastWorkspaceId')
    if (lastWorkspaceId) {
      navigate(workspaceAccountingPath(lastWorkspaceId), { replace: true })
    }
  }, [navigate])

  // Auto-select when exactly one workspace
  useEffect(() => {
    if (workspaces && workspaces.length === 1) {
      const id = workspaces[0].id
      sessionStorage.setItem('lastWorkspaceId', id)
      navigate(workspaceAccountingPath(id), { replace: true })
    }
  }, [workspaces, navigate])

  function handleSelect(id: string) {
    sessionStorage.setItem('lastWorkspaceId', id)
    navigate(workspaceAccountingPath(id))
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
            {t('workspace.workspacePicker')}
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

        {workspaces && workspaces.length === 0 && (
          <>
            <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
              {t('workspace.noWorkspaces')}
            </Typography>
            {canManageWorkspaces ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button variant="contained" onClick={() => setCreateOpen(true)}>
                  {t('workspace.createFirstWorkspace')}
                </Button>
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mt: 3 }}>
                {t('workspace.insufficientPermissionsCreate')}
              </Alert>
            )}
            <WorkspaceFormDialog
              open={createOpen}
              onClose={() => setCreateOpen(false)}
              onCreated={(id) => {
                sessionStorage.setItem('lastWorkspaceId', id)
                navigate(workspaceAccountingPath(id))
              }}
            />
          </>
        )}

        {workspaces && workspaces.length > 1 && (
          <List>
            {workspaces.map((workspace) => (
              <ListItemButton
                key={workspace.id}
                onClick={() => handleSelect(workspace.id)}
                disabled={workspace.status === 'inactive'}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText
                  primary={workspace.name}
                  secondary={workspace.status === 'inactive' ? '(inactive)' : undefined}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {workspaces && workspaces.length === 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>{t('workspace.autoSelecting')}</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

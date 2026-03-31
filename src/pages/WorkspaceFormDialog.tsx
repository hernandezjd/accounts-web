import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { useTranslation } from 'react-i18next'
import { useWorkspaceMutations } from '@/hooks/api/useWorkspaceMutations'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { formatError, type FormattedError } from '@/lib/error/useErrorHandler'

export interface WorkspaceFormData {
  id: string
  name: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
}

interface WorkspaceFormDialogProps {
  open: boolean
  onClose: () => void
  editWorkspace?: WorkspaceFormData
  onCreated?: (id: string) => void
}

export function WorkspaceFormDialog({ open, onClose, editWorkspace, onCreated }: WorkspaceFormDialogProps) {
  const { t } = useTranslation()
  const { createWorkspace, updateWorkspace } = useWorkspaceMutations()
  const isEdit = Boolean(editWorkspace)

  const [name, setName] = useState(editWorkspace?.name ?? '')
  const [contactName, setContactName] = useState(editWorkspace?.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(editWorkspace?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(editWorkspace?.contactPhone ?? '')
  const [street, setStreet] = useState(editWorkspace?.address?.street ?? '')
  const [city, setCity] = useState(editWorkspace?.address?.city ?? '')
  const [state, setState] = useState(editWorkspace?.address?.state ?? '')
  const [postalCode, setPostalCode] = useState(editWorkspace?.address?.postalCode ?? '')
  const [country, setCountry] = useState(editWorkspace?.address?.country ?? '')
  const [error, setError] = useState<FormattedError | null>(null)

  const handleClose = () => {
    setError(null)
    onClose()
  }

  const handleSubmit = () => {
    setError(null)
    const body = {
      name,
      contactName: contactName || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || undefined,
      address: {
        street: street || '',
        city: city || '',
        state: state || '',
        postalCode: postalCode || '',
        country: country || '',
      },
    }

    if (isEdit) {
      updateWorkspace.mutate(
        { id: editWorkspace!.id, body },
        { onSuccess: handleClose, onError: (err) => setError(formatError(err)) },
      )
    } else {
      createWorkspace.mutate(body, {
        onSuccess: (data) => {
          if (data?.id) {
            onCreated?.(data.id)
            handleClose()
          }
        },
        onError: (err) => setError(formatError(err)),
      })
    }
  }

  const canSave = name.trim()

  const isPending = createWorkspace.isPending || updateWorkspace.isPending

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="workspace-form-dialog">
      <DialogTitle>
        {isEdit ? t('setup.workspaces.editWorkspace') : t('setup.workspaces.createWorkspace')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
        <TextField
          label={t('setup.workspaces.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'workspace-name-input' }}
        />
        <TextField
          label={t('setup.workspaces.contactName')}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          size="small"
          inputProps={{ 'data-testid': 'workspace-contact-name-input' }}
        />
        <TextField
          label={t('setup.workspaces.contactEmail')}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          type="email"
          size="small"
          inputProps={{ 'data-testid': 'workspace-contact-email-input' }}
        />
        <TextField
          label={t('setup.workspaces.contactPhone')}
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          size="small"
          inputProps={{ 'data-testid': 'workspace-contact-phone-input' }}
        />
        <TextField
          label={t('setup.workspaces.street')}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          size="small"
          inputProps={{ 'data-testid': 'workspace-street-input' }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label={t('setup.workspaces.city')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
            inputProps={{ 'data-testid': 'workspace-city-input' }}
          />
          <TextField
            label={t('setup.workspaces.state')}
            value={state}
            onChange={(e) => setState(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            inputProps={{ 'data-testid': 'workspace-state-input' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label={t('setup.workspaces.postalCode')}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            inputProps={{ 'data-testid': 'workspace-postal-input' }}
          />
          <TextField
            label={t('setup.workspaces.country')}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
            inputProps={{ 'data-testid': 'workspace-country-input' }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canSave || isPending}
          data-testid="workspace-form-save"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

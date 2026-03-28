import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { useTranslation } from 'react-i18next'
import { useTenantMutations } from '@/hooks/api/useTenantMutations'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { formatError, type FormattedError } from '@/lib/error/useErrorHandler'

export interface TenantFormData {
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

interface TenantFormDialogProps {
  open: boolean
  onClose: () => void
  editTenant?: TenantFormData
  onCreated?: (id: string) => void
}

export function TenantFormDialog({ open, onClose, editTenant, onCreated }: TenantFormDialogProps) {
  const { t } = useTranslation()
  const { createTenant, updateTenant } = useTenantMutations()
  const isEdit = Boolean(editTenant)

  const [name, setName] = useState(editTenant?.name ?? '')
  const [contactName, setContactName] = useState(editTenant?.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(editTenant?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(editTenant?.contactPhone ?? '')
  const [street, setStreet] = useState(editTenant?.address?.street ?? '')
  const [city, setCity] = useState(editTenant?.address?.city ?? '')
  const [state, setState] = useState(editTenant?.address?.state ?? '')
  const [postalCode, setPostalCode] = useState(editTenant?.address?.postalCode ?? '')
  const [country, setCountry] = useState(editTenant?.address?.country ?? '')
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
      updateTenant.mutate(
        { id: editTenant!.id, body },
        { onSuccess: handleClose, onError: (err) => setError(formatError(err)) },
      )
    } else {
      createTenant.mutate(body, {
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

  const isPending = createTenant.isPending || updateTenant.isPending

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="tenant-form-dialog">
      <DialogTitle>
        {isEdit ? t('setup.tenants.editTenant') : t('setup.tenants.createTenant')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
        <TextField
          label={t('setup.tenants.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'tenant-name-input' }}
        />
        <TextField
          label={t('setup.tenants.contactName')}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          size="small"
          inputProps={{ 'data-testid': 'tenant-contact-name-input' }}
        />
        <TextField
          label={t('setup.tenants.contactEmail')}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          type="email"
          size="small"
          inputProps={{ 'data-testid': 'tenant-contact-email-input' }}
        />
        <TextField
          label={t('setup.tenants.contactPhone')}
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          size="small"
          inputProps={{ 'data-testid': 'tenant-contact-phone-input' }}
        />
        <TextField
          label={t('setup.tenants.street')}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          size="small"
          inputProps={{ 'data-testid': 'tenant-street-input' }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label={t('setup.tenants.city')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
            inputProps={{ 'data-testid': 'tenant-city-input' }}
          />
          <TextField
            label={t('setup.tenants.state')}
            value={state}
            onChange={(e) => setState(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            inputProps={{ 'data-testid': 'tenant-state-input' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label={t('setup.tenants.postalCode')}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            inputProps={{ 'data-testid': 'tenant-postal-input' }}
          />
          <TextField
            label={t('setup.tenants.country')}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
            inputProps={{ 'data-testid': 'tenant-country-input' }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canSave || isPending}
          data-testid="tenant-form-save"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

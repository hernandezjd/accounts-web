import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import { useTenantMutations } from '@/hooks/api/useTenantMutations'

interface TenantCreationDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}

export function TenantCreationDialog({ open, onClose, onCreated }: TenantCreationDialogProps) {
  const { t } = useTranslation()
  const { createTenant } = useTenantMutations()

  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setContactName('')
    setContactEmail('')
    setContactPhone('')
    setStreet('')
    setCity('')
    setState('')
    setPostalCode('')
    setCountry('')
    setErrorMsg(null)
  }

  const handleSubmit = () => {
    setErrorMsg(null)
    createTenant.mutate(
      {
        name,
        contactName,
        contactEmail,
        ...(contactPhone.trim() ? { contactPhone } : {}),
        address: { street, city, state, postalCode, country },
      },
      {
        onSuccess: (data) => {
          onCreated(data.id!)
          reset()
          onClose()
        },
        onError: (err) => setErrorMsg(err.message),
      },
    )
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const isValid =
    name.trim() &&
    contactName.trim() &&
    contactEmail.trim() &&
    street.trim() &&
    city.trim() &&
    state.trim() &&
    postalCode.trim() &&
    country.trim()

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('setup.tenants.createTenant')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <TextField
          label={t('setup.tenants.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('setup.tenants.contactName')}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('setup.tenants.contactEmail')}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('setup.tenants.contactPhone')}
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          size="small"
        />
        <TextField
          label={t('setup.tenants.street')}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('setup.tenants.city')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('setup.tenants.state')}
          value={state}
          onChange={(e) => setState(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('setup.tenants.postalCode')}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('setup.tenants.country')}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid || createTenant.isPending}
        >
          {t('setup.tenants.createTenant')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

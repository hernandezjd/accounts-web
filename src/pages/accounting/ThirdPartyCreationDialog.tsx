import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import { useThirdPartyMutations } from '@/hooks/api/useThirdPartyMutations'

interface CreatedThirdParty {
  id: string
  name: string
}

interface ThirdPartyCreationDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (tp: CreatedThirdParty) => void
}

export function ThirdPartyCreationDialog({
  open,
  onClose,
  onCreated,
}: ThirdPartyCreationDialogProps) {
  const { t } = useTranslation()
  const { createThirdParty } = useThirdPartyMutations()

  const [externalId, setExternalId] = useState('')
  const [name, setName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const reset = () => {
    setExternalId('')
    setName('')
    setStreet('')
    setCity('')
    setState('')
    setPostalCode('')
    setCountry('')
    setErrorMsg(null)
  }

  const handleSubmit = () => {
    setErrorMsg(null)
    createThirdParty.mutate(
      {
        externalId,
        name,
        address: {
          street: street || '',
          city: city || '',
          state: state || '',
          postalCode: postalCode || '',
          country: country || '',
        },
      },
      {
        onSuccess: (data) => {
          onCreated({ id: data.id!, name: data.name! })
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

  const isValid = externalId.trim() && name.trim()

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('transactionForm.createThirdParty')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <TextField
          label={t('transactionForm.externalId')}
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('transactionForm.accountName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
        />
        <TextField
          label={t('transactionForm.street')}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          size="small"
        />
        <TextField
          label={t('transactionForm.city')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          size="small"
        />
        <TextField
          label={t('transactionForm.state')}
          value={state}
          onChange={(e) => setState(e.target.value)}
          size="small"
        />
        <TextField
          label={t('transactionForm.postalCode')}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          size="small"
        />
        <TextField
          label={t('transactionForm.country')}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid || createThirdParty.isPending}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

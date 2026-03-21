import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'

export interface CustomPeriodType {
  id: string
  name: string
  from: string
  to: string
}

interface CustomPeriodTypeDialogProps {
  open: boolean
  from: string
  to: string
  onClose: () => void
  onSave: (periodType: CustomPeriodType) => void
  existingNames: string[]
}

export function CustomPeriodTypeDialog({
  open,
  from,
  to,
  onClose,
  onSave,
  existingNames,
}: CustomPeriodTypeDialogProps) {
  const { t } = useTranslation()

  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = () => {
    setErrorMsg(null)

    // Validate name
    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorMsg(t('accounting.period.customType.nameRequired'))
      return
    }

    if (existingNames.includes(trimmedName)) {
      setErrorMsg(t('accounting.period.customType.nameDuplicate'))
      return
    }

    // Create period type with auto-generated ID (timestamp + random)
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    onSave({ id, name: trimmedName, from, to })
    setName('')
    onClose()
  }

  const handleClose = () => {
    setName('')
    setErrorMsg(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('accounting.period.customType.saveTitle')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
          <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {t('accounting.period.customType.periodRange', {
              from,
              to,
            })}
          </Box>
          <TextField
            label={t('accounting.period.customType.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            size="small"
            inputProps={{ 'data-testid': 'custom-period-type-name-input' }}
            autoFocus
            placeholder={t('accounting.period.customType.namePlaceholder')}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!name.trim()}
          data-testid="custom-period-type-save-button"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

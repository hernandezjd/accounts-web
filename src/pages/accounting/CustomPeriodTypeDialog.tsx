import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import { useErrorHandler } from '@/lib/error/useErrorHandler'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import type { FormattedError } from '@/lib/error/useErrorHandler'

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
  const { error, setError, clearError } = useErrorHandler()

  const [name, setName] = useState('')

  const handleSubmit = () => {
    clearError()

    // Validate name
    const trimmedName = name.trim()
    if (!trimmedName) {
      const validationError: FormattedError = {
        errorCode: 'VALIDATION_ERROR',
        userMessage: t('accounting.period.customType.nameRequired'),
        requestId: 'local-validation',
        timestamp: new Date().toISOString(),
        showSupportContact: false,
        classification: 'validation' as any,
        isRetryable: false,
        severity: 'error',
      }
      setError(validationError)
      return
    }

    if (existingNames.includes(trimmedName)) {
      const validationError: FormattedError = {
        errorCode: 'VALIDATION_ERROR',
        userMessage: t('accounting.period.customType.nameDuplicate'),
        requestId: 'local-validation',
        timestamp: new Date().toISOString(),
        showSupportContact: false,
        classification: 'validation' as any,
        isRetryable: false,
        severity: 'error',
      }
      setError(validationError)
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
    clearError()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('accounting.period.customType.saveTitle')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <ErrorMessage error={error} onDismiss={clearError} />
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

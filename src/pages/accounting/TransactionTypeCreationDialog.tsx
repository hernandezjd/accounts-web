import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import { useTransactionTypeMutations } from '@/hooks/api/useTransactionTypeMutations'
import { translateApiError } from '@/utils/errorUtils'

interface CreatedTransactionType {
  id: string
  name: string
}

interface TransactionTypeCreationDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (type: CreatedTransactionType) => void
}

export function TransactionTypeCreationDialog({
  open,
  onClose,
  onCreated,
}: TransactionTypeCreationDialogProps) {
  const { t } = useTranslation()
  const { createTransactionType } = useTransactionTypeMutations()

  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = () => {
    setErrorMsg(null)
    createTransactionType.mutate(
      { name },
      {
        onSuccess: (data) => {
          if (data?.id && data?.name) {
            onCreated({ id: data.id, name: data.name })
            setName('')
            onClose()
          }
        },
        onError: (err) => setErrorMsg(translateApiError(err, t)),
      },
    )
  }

  const handleClose = () => {
    setName('')
    setErrorMsg(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('transactionForm.createTransactionType')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <TextField
          label={t('transactionForm.transactionTypeName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'transaction-type-name-input' }}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!name.trim() || createTransactionType.isPending}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

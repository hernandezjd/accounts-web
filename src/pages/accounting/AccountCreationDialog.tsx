import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import { useAccountMutations } from '@/hooks/api/useAccountMutations'

interface CreatedAccount {
  id: string
  code: string
  name: string
}

interface AccountCreationDialogProps {
  tenantId: string
  open: boolean
  onClose: () => void
  onCreated: (account: CreatedAccount) => void
}

export function AccountCreationDialog({
  tenantId,
  open,
  onClose,
  onCreated,
}: AccountCreationDialogProps) {
  const { t } = useTranslation()
  const { createAccount } = useAccountMutations(tenantId)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = () => {
    setErrorMsg(null)
    createAccount.mutate(
      { code, name, hasThirdParties: false, parentId: parentId.trim() || undefined },
      {
        onSuccess: (data) => {
          onCreated({ id: data.accountId!, code: data.code!, name: data.name! })
          setCode('')
          setName('')
          setParentId('')
          onClose()
        },
        onError: (err) => setErrorMsg(err.message),
      },
    )
  }

  const handleClose = () => {
    setCode('')
    setName('')
    setParentId('')
    setErrorMsg(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('transactionForm.createAccount')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <TextField
          label={t('transactionForm.accountCode')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'account-code-input' }}
        />
        <TextField
          label={t('transactionForm.accountName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'account-name-input' }}
        />
        <TextField
          label={t('transactionForm.parentAccount')}
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          size="small"
          helperText="UUID (optional)"
          inputProps={{ 'data-testid': 'parent-id-input' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!code.trim() || !name.trim() || createAccount.isPending}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

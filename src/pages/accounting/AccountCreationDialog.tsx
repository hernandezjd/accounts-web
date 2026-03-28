import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import { useTranslation } from 'react-i18next'
import { useAccountMutations } from '@/hooks/api/useAccountMutations'
import { AccountPicker, type AccountPickerOption } from '@/components/AccountPicker'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import type { FormattedError } from '@/lib/error/useErrorHandler'

interface CreatedAccount {
  id: string
  code: string
  name: string
  hasThirdParties: boolean
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
  const [parentAccount, setParentAccount] = useState<AccountPickerOption | null>(null)
  const [hasThirdParties, setHasThirdParties] = useState(false)
  const [error, setError] = useState<FormattedError | null>(null)

  const handleSubmit = () => {
    setError(null)
    createAccount.mutate(
      { code, name, hasThirdParties, parentId: parentAccount?.id },
      {
        onSuccess: (data) => {
          onCreated({ id: data.accountId!, code: data.code!, name: data.name!, hasThirdParties })
          setCode('')
          setName('')
          setParentAccount(null)
          setHasThirdParties(false)
          onClose()
        },
        onError: (err) => setError(err),
      },
    )
  }

  const handleClose = () => {
    setCode('')
    setName('')
    setParentAccount(null)
    setHasThirdParties(false)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('transactionForm.createAccount')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <ErrorMessage error={error} onDismiss={() => setError(null)} />
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
        <AccountPicker
          tenantId={tenantId}
          value={parentAccount}
          onChange={setParentAccount}
          label={t('transactionForm.parentAccount')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={hasThirdParties}
              onChange={(e) => setHasThirdParties(e.target.checked)}
              data-testid="has-third-parties-checkbox"
            />
          }
          label={t('accountForm.hasThirdParties')}
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

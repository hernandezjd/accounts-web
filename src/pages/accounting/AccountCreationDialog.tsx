import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import { useTranslation } from 'react-i18next'
import { useAccountMutations } from '@/hooks/api/useAccountMutations'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { CurrencyMultiSelect } from '@/components/CurrencyMultiSelect'
import { AccountPicker, type AccountPickerOption } from '@/components/AccountPicker'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import type { FormattedError } from '@accounts/error-handling-web'

interface CreatedAccount {
  id: string
  code: string
  name: string
  hasThirdParties: boolean
}

interface AccountCreationDialogProps {
  workspaceId: string
  open: boolean
  onClose: () => void
  onCreated: (account: CreatedAccount) => void
}

export function AccountCreationDialog({
  workspaceId,
  open,
  onClose,
  onCreated,
}: AccountCreationDialogProps) {
  const { t } = useTranslation()
  const { createAccount } = useAccountMutations(workspaceId)
  const { data: config } = useWorkspaceConfig(workspaceId)
  const enabledCurrencies = config?.enabledCurrencies ?? []

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [parentAccount, setParentAccount] = useState<AccountPickerOption | null>(null)
  const [hasThirdParties, setHasThirdParties] = useState(false)
  // Empty = the base currency, which the server applies by default (MC-05, MC-06)
  const [currencies, setCurrencies] = useState<string[]>([])
  const [nativeCurrency, setNativeCurrency] = useState('')
  const [error, setError] = useState<FormattedError | null>(null)

  const handleSubmit = () => {
    setError(null)
    createAccount.mutate(
      { code, name, hasThirdParties, parentId: parentAccount?.id, ...(currencies.length > 0 ? { currencies } : {}), ...(nativeCurrency ? { nativeCurrency } : {}) },
      {
        onSuccess: (data) => {
          onCreated({ id: data.accountId!, code: data.code!, name: data.name!, hasThirdParties })
          setCode('')
          setName('')
          setParentAccount(null)
          setHasThirdParties(false)
          setCurrencies([])
          setNativeCurrency('')
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
    setCurrencies([])
    setNativeCurrency('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth scroll="paper">
      <DialogTitle>{t('transactionForm.createAccount')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
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
            workspaceId={workspaceId}
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
          {enabledCurrencies.length > 1 && (
            <TextField
              select
              size="small"
              label={t('currency.nativeCurrency')}
              helperText={t('currency.nativeCurrencyHelp')}
              value={nativeCurrency || config?.baseCurrency || ''}
              onChange={(e) => setNativeCurrency(e.target.value)}
              inputProps={{ 'data-testid': 'account-native-currency-input' }}
            >
              {enabledCurrencies.map((code) => (
                <MenuItem key={code} value={code}>
                  {code}
                </MenuItem>
              ))}
            </TextField>
          )}
          {enabledCurrencies.length > 1 && (
            <CurrencyMultiSelect
              label={t('currency.trackedCurrencies')}
              value={currencies.length > 0 ? currencies : config?.baseCurrency ? [config.baseCurrency] : []}
              onChange={setCurrencies}
              options={enabledCurrencies}
              testId="account-currencies-input"
            />
          )}
        </Stack>
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

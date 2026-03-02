import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AddIcon from '@mui/icons-material/Add'
import { useTranslation } from 'react-i18next'
import { useAccounts, type Account } from '@/hooks/api/useAccounts'
import { useAccountMutations } from '@/hooks/api/useAccountMutations'
import { useCodeStructureConfig } from '@/hooks/api/useCodeStructureConfig'
import { translateApiError } from '@/utils/errorUtils'
import { QueryErrorAlert } from '@/components/QueryErrorAlert'
import { AccountPicker, type AccountPickerOption } from '@/components/AccountPicker'

// ─── AccountFormDialog ─────────────────────────────────────────────────────────

interface AccountFormDialogProps {
  open: boolean
  onClose: () => void
  tenantId: string
  editAccount?: Account
  accounts: Account[]
}

function AccountFormDialog({
  open,
  onClose,
  tenantId,
  editAccount,
  accounts,
}: AccountFormDialogProps) {
  const { t } = useTranslation()
  const { createAccount, updateAccount } = useAccountMutations(tenantId)
  const { data: codeStructureConfig } = useCodeStructureConfig(tenantId)

  const isEdit = Boolean(editAccount)

  const [code, setCode] = useState(editAccount?.code ?? '')
  const [name, setName] = useState(editAccount?.name ?? '')
  const [parentAccount, setParentAccount] = useState<AccountPickerOption | null>(null)
  const [hasThirdParties, setHasThirdParties] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setCode(editAccount?.code ?? '')
    setName(editAccount?.name ?? '')
    setParentAccount(null)
    setHasThirdParties(false)
    setErrorMsg(null)
    onClose()
  }

  // Code-structure hint for the code field
  const codeHint = (() => {
    if (!codeStructureConfig?.enabled) return null
    if (!isEdit && !parentAccount) {
      const len = codeStructureConfig.rootCodeLength
      return len ? `${len}-character code` : null
    }
    if (!isEdit && parentAccount) {
      const parent = accounts.find((a) => a.id === parentAccount.id)
      if (parent?.code && parent.level) {
        const nextLevel = parent.level + 1
        const segLen = codeStructureConfig.segmentLengthByLevel?.[nextLevel]
        if (segLen) return `${parent.code} + ${segLen}-character segment`
      }
    }
    return null
  })()

  const handleSubmit = () => {
    setErrorMsg(null)
    if (isEdit) {
      updateAccount.mutate(
        { id: editAccount!.id!, body: { code, name } },
        {
          onSuccess: handleClose,
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    } else {
      createAccount.mutate(
        { code, name, hasThirdParties, parentId: parentAccount?.id },
        {
          onSuccess: handleClose,
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    }
  }

  const isPending = createAccount.isPending || updateAccount.isPending

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? t('accounts.editAccount') : t('accounts.createAccount')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <TextField
          label={t('accounts.code')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          size="small"
          helperText={codeHint ?? undefined}
          inputProps={{ 'data-testid': 'account-code-input' }}
        />
        <TextField
          label={t('accounts.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
          inputProps={{ 'data-testid': 'account-name-input' }}
        />
        {!isEdit && (
          <>
            <AccountPicker
              tenantId={tenantId}
              value={parentAccount}
              onChange={setParentAccount}
              label={t('transactionForm.parentAccount')}
              excludeAccountId={editAccount?.id}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasThirdParties}
                  onChange={(e) => setHasThirdParties(e.target.checked)}
                />
              }
              label={t('accounts.hasThirdParties')}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!code.trim() || !name.trim() || isPending}
          data-testid="account-form-save"
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── DeleteAccountDialog ───────────────────────────────────────────────────────

interface DeleteAccountDialogProps {
  open: boolean
  onClose: () => void
  account: Account | null
  tenantId: string
}

function DeleteAccountDialog({ open, onClose, account, tenantId }: DeleteAccountDialogProps) {
  const { t } = useTranslation()
  const { deleteAccount } = useAccountMutations(tenantId)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!account?.id) return
    setErrorMsg(null)
    deleteAccount.mutate(account.id, {
      onSuccess: handleClose,
      onError: (err) => setErrorMsg(translateApiError(err, t)),
    })
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('accounts.deleteTitle')}</DialogTitle>
      <DialogContent>
        {errorMsg ? (
          <Alert severity="error">{errorMsg}</Alert>
        ) : (
          <DialogContentText>{t('accounts.deleteConfirm')}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        {!errorMsg && (
          <Button
            color="error"
            onClick={handleConfirm}
            disabled={deleteAccount.isPending}
            data-testid="confirm-delete-account"
          >
            {t('common.delete')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── ToggleTpDialog ────────────────────────────────────────────────────────────

interface ToggleTpDialogProps {
  open: boolean
  onClose: () => void
  account: Account | null
  tenantId: string
}

function ToggleTpDialog({ open, onClose, account, tenantId }: ToggleTpDialogProps) {
  const { t } = useTranslation()
  const { toggleHasThirdParties } = useAccountMutations(tenantId)
  const [thirdPartyId, setThirdPartyId] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [needsThirdPartyId, setNeedsThirdPartyId] = useState(false)

  const enabling = !account?.hasThirdParties

  const handleClose = () => {
    setThirdPartyId('')
    setErrorMsg(null)
    setNeedsThirdPartyId(false)
    onClose()
  }

  const handleConfirm = () => {
    if (!account?.id) return
    setErrorMsg(null)
    toggleHasThirdParties.mutate(
      { accountId: account.id, body: { enabled: enabling, thirdPartyId: thirdPartyId.trim() || undefined } },
      {
        onSuccess: handleClose,
        onError: (err) => {
          const msg = err instanceof Error ? err.message : ''
          if (enabling && msg.toLowerCase().includes('thirdparty')) {
            setNeedsThirdPartyId(true)
          }
          setErrorMsg(translateApiError(err, t))
        },
      },
    )
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('accounts.toggleTpTitle')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DialogContentText>
          {enabling ? t('accounts.toggleTpEnable') : t('accounts.toggleTpDisable')}
        </DialogContentText>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        {needsThirdPartyId && (
          <TextField
            label={t('accounts.toggleTpThirdPartyId')}
            value={thirdPartyId}
            onChange={(e) => setThirdPartyId(e.target.value)}
            size="small"
            inputProps={{ 'data-testid': 'toggle-tp-third-party-id' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={toggleHasThirdParties.isPending}
          data-testid="confirm-toggle-tp"
        >
          {enabling ? t('accounts.enable') : t('accounts.disable')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── AccountsPage ──────────────────────────────────────────────────────────────

export function AccountsPage() {
  const { t } = useTranslation()
  const { tenantId = '' } = useParams<{ tenantId: string }>()

  const { data: accounts, isLoading, isError, refetch } = useAccounts(tenantId || null)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [toggleTpTarget, setToggleTpTarget] = useState<Account | null>(null)

  // id → code map for parent code display
  const idToCode: Record<string, string> = {}
  for (const acc of accounts ?? []) {
    if (acc.id && acc.code) idToCode[acc.id] = acc.code
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('accounts.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditTarget(undefined); setFormOpen(true) }}
          data-testid="new-account-btn"
        >
          {t('accounts.newAccount')}
        </Button>
      </Box>

      {isLoading && <Typography>{t('accounts.loading')}</Typography>}
      {isError && <QueryErrorAlert message={t('accounts.error')} onRetry={refetch} />}

      {!isLoading && !isError && (
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" data-testid="accounts-table">
          <TableHead>
            <TableRow>
              <TableCell>{t('accounts.code')}</TableCell>
              <TableCell>{t('accounts.name')}</TableCell>
              <TableCell>{t('accounts.level')}</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('accounts.parentCode')}</TableCell>
              <TableCell>{t('accounts.hasThirdParties')}</TableCell>
              <TableCell>{t('accounts.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(accounts ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>{t('accounts.noAccounts')}</TableCell>
              </TableRow>
            )}
            {(accounts ?? []).map((account) => (
              <TableRow key={account.id} data-testid={`account-row-${account.id}`}>
                <TableCell>{account.code}</TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.level}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  {account.parentId ? (idToCode[account.parentId] ?? '—') : '—'}
                </TableCell>
                <TableCell>{account.hasThirdParties ? '✓' : ''}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => { setEditTarget(account); setFormOpen(true) }}
                    aria-label={t('common.edit')}
                    data-testid={`edit-account-${account.id}`}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(account)}
                    aria-label={t('common.delete')}
                    data-testid={`delete-account-${account.id}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setToggleTpTarget(account)}
                    aria-label={t('accounts.toggleTp')}
                    data-testid={`toggle-tp-${account.id}`}
                  >
                    <SwapHorizIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Box>
      )}

      <AccountFormDialog
        key={editTarget?.id ?? 'new'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        tenantId={tenantId}
        editAccount={editTarget}
        accounts={accounts ?? []}
      />
      <DeleteAccountDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        account={deleteTarget}
        tenantId={tenantId}
      />
      <ToggleTpDialog
        open={Boolean(toggleTpTarget)}
        onClose={() => setToggleTpTarget(null)}
        account={toggleTpTarget}
        tenantId={tenantId}
      />
    </Box>
  )
}

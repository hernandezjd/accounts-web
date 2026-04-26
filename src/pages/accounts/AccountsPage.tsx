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
import Tooltip from '@mui/material/Tooltip'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AddIcon from '@mui/icons-material/Add'
import { useTranslation } from 'react-i18next'
import { useAccounts, type Account } from '@/hooks/api/useAccounts'
import { useAccountMutations } from '@/hooks/api/useAccountMutations'
import { useCodeStructureConfig } from '@/hooks/api/useCodeStructureConfig'
import { useUserActions } from '@/hooks/useUserActions'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import type { FormattedError } from '@/lib/error/useErrorHandler'
import { AccountPicker, type AccountPickerOption } from '@/components/AccountPicker'

// ─── AccountFormDialog ─────────────────────────────────────────────────────────

interface AccountFormDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  editAccount?: Account
  accounts: Account[]
}

function AccountFormDialog({
  open,
  onClose,
  workspaceId,
  editAccount,
  accounts,
}: AccountFormDialogProps) {
  const { t } = useTranslation()
  const { createAccount, updateAccount } = useAccountMutations(workspaceId)
  const { data: codeStructureConfig } = useCodeStructureConfig(workspaceId)

  const isEdit = Boolean(editAccount)

  const [code, setCode] = useState(editAccount?.code ?? '')
  const [name, setName] = useState(editAccount?.name ?? '')
  const [parentId, setParentId] = useState<string | null>(
    isEdit ? editAccount?.parentId ?? null : null
  )
  const [parentAccount, setParentAccount] = useState<AccountPickerOption | null>(null)
  const [hasThirdParties, setHasThirdParties] = useState(false)
  const [errorMsg, setErrorMsg] = useState<FormattedError | null>(null)

  const handleClose = () => {
    setCode(editAccount?.code ?? '')
    setName(editAccount?.name ?? '')
    setParentAccount(null)
    setParentId(isEdit ? editAccount?.parentId ?? null : null)
    setHasThirdParties(false)
    setErrorMsg(null)
    onClose()
  }

  // Code-structure hint for the code field
  const codeHint = (() => {
    if (!codeStructureConfig?.enabled) return null
    const effectiveParentId = isEdit ? parentId : parentAccount?.id
    if (!effectiveParentId) {
      const len = codeStructureConfig.rootCodeLength
      return len ? `${len}-character code` : null
    }
    const parent = accounts.find((a) => a.id === effectiveParentId)
    if (parent?.code && parent.level) {
      const nextLevel = parent.level + 1
      const segLen = codeStructureConfig.segmentLengthByLevel?.[nextLevel]
      if (segLen) return `${parent.code} + ${segLen}-character segment`
    }
    return null
  })()

  const handleSubmit = () => {
    setErrorMsg(null)
    if (isEdit) {
      // Note: parentId is a valid field per FR-094, but the generated API types may not include it yet
      updateAccount.mutate(
        { id: editAccount!.id!, body: { code, name, parentId: parentId ?? undefined } as any },
        {
          onSuccess: handleClose,
          onError: (err) => setErrorMsg(err),
        },
      )
    } else {
      createAccount.mutate(
        { code, name, hasThirdParties, parentId: parentAccount?.id },
        {
          onSuccess: handleClose,
          onError: (err) => setErrorMsg(err),
        },
      )
    }
  }

  const isPending = createAccount.isPending || updateAccount.isPending

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? t('accounts.editAccount') : t('accounts.createAccount')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {errorMsg && <ErrorMessage error={errorMsg} />}
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
        <div style={{opacity: isEdit && (editAccount?.hasTransactions || editAccount?.hasInitialBalances) ? 0.6 : 1, pointerEvents: isEdit && (editAccount?.hasTransactions || editAccount?.hasInitialBalances) ? 'none' : 'auto'}}>
          <div style={{marginBottom: '1rem'}}>
            <AccountPicker
              workspaceId={workspaceId}
              value={isEdit && editAccount?.parentId ? { id: editAccount.parentId, code: accounts.find(a => a.id === editAccount.parentId)?.code || '', name: accounts.find(a => a.id === editAccount.parentId)?.name || '' } : parentAccount}
              onChange={(option) => {
                if (isEdit) {
                  setParentId(option?.id ?? null)
                } else {
                  setParentAccount(option)
                }
              }}
              label={t('transactionForm.parentAccount')}
              excludeAccountId={editAccount?.id}
            />
          </div>
        </div>
        {isEdit && (editAccount?.hasTransactions || editAccount?.hasInitialBalances) && (
          <Alert severity="info">
            {editAccount.hasTransactions && editAccount.hasInitialBalances
              ? 'Account has transactions and initial balances - parent cannot be changed'
              : editAccount.hasTransactions
              ? 'Account has transactions - parent cannot be changed'
              : 'Account has initial balances - parent cannot be changed'}
          </Alert>
        )}
        {!isEdit && (
          <FormControlLabel
            control={
              <Checkbox
                checked={hasThirdParties}
                onChange={(e) => setHasThirdParties(e.target.checked)}
              />
            }
            label={t('accounts.hasThirdParties')}
          />
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

// ─── DeactivateAccountDialog ──────────────────────────────────────────────────

interface DeactivateAccountDialogProps {
  open: boolean
  onClose: () => void
  account: Account | null
  workspaceId: string
}

function DeactivateAccountDialog({ open, onClose, account, workspaceId }: DeactivateAccountDialogProps) {
  const { t } = useTranslation()
  const { deactivateAccount } = useAccountMutations(workspaceId)
  const [errorMsg, setErrorMsg] = useState<FormattedError | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!account?.id) return
    setErrorMsg(null)
    deactivateAccount.mutate(account.id, {
      onSuccess: handleClose,
      onError: (err) => setErrorMsg(err),
    })
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('accounts.deactivateTitle')}</DialogTitle>
      <DialogContent>
        {errorMsg ? (
          <ErrorMessage error={errorMsg} />
        ) : (
          <DialogContentText>{t('accounts.deactivateConfirm')}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        {!errorMsg && (
          <Button
            color="error"
            onClick={handleConfirm}
            disabled={deactivateAccount.isPending}
            data-testid="confirm-deactivate-account"
          >
            {t('accounts.deactivateTitle')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── ReactivateAccountDialog ──────────────────────────────────────────────────

interface ReactivateAccountDialogProps {
  open: boolean
  onClose: () => void
  account: Account | null
  workspaceId: string
}

function ReactivateAccountDialog({ open, onClose, account, workspaceId }: ReactivateAccountDialogProps) {
  const { t } = useTranslation()
  const { activateAccount } = useAccountMutations(workspaceId)
  const [errorMsg, setErrorMsg] = useState<FormattedError | null>(null)

  const handleClose = () => {
    setErrorMsg(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!account?.id) return
    setErrorMsg(null)
    activateAccount.mutate(account.id, {
      onSuccess: handleClose,
      onError: (err) => setErrorMsg(err),
    })
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('accounts.reactivateTitle')}</DialogTitle>
      <DialogContent>
        {errorMsg ? (
          <ErrorMessage error={errorMsg} />
        ) : (
          <DialogContentText>{t('accounts.reactivateConfirm')}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel')}</Button>
        {!errorMsg && (
          <Button
            color="primary"
            variant="contained"
            onClick={handleConfirm}
            disabled={activateAccount.isPending}
            data-testid="confirm-reactivate-account"
          >
            {t('accounts.reactivateTitle')}
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
  workspaceId: string
}

function ToggleTpDialog({ open, onClose, account, workspaceId }: ToggleTpDialogProps) {
  const { t } = useTranslation()
  const { toggleHasThirdParties } = useAccountMutations(workspaceId)
  const [thirdPartyId, setThirdPartyId] = useState('')
  const [errorMsg, setErrorMsg] = useState<FormattedError | null>(null)
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
          const msg = (err as any).userMessage || (err instanceof Error ? err.message : '')
          if (enabling && msg.toLowerCase().includes('thirdparty')) {
            setNeedsThirdPartyId(true)
          }
          setErrorMsg(err)
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
        {errorMsg && <ErrorMessage error={errorMsg} />}
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
  const { workspaceId = '' } = useParams<{ workspaceId: string }>()
  const { hasAction } = useUserActions()

  const { data: accounts, isLoading, isError, error: apiError, refetch } = useAccounts(workspaceId || null, true)

  // Format error for display with classification
  const formattedError = apiError ?? null

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | undefined>(undefined)
  const [deactivateTarget, setDeactivateTarget] = useState<Account | null>(null)
  const [reactivateTarget, setReactivateTarget] = useState<Account | null>(null)
  const [toggleTpTarget, setToggleTpTarget] = useState<Account | null>(null)

  const canCreateAccount = hasAction('create_account')

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
        <Tooltip title={!canCreateAccount ? t('common.insufficientPermissions') : ''}>
          <span>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditTarget(undefined); setFormOpen(true) }}
              disabled={!canCreateAccount}
              data-testid="new-account-btn"
            >
              {t('accounts.newAccount')}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {isLoading && <Typography>{t('accounts.loading')}</Typography>}
      {isError && <ErrorMessage error={formattedError} onRetry={() => void refetch()} />}

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
              <TableCell>{t('accounts.status')}</TableCell>
              <TableCell>{t('accounts.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(accounts ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>{t('accounts.noAccounts')}</TableCell>
              </TableRow>
            )}
            {(accounts ?? []).map((account) => (
              <TableRow
                key={account.id}
                data-testid={`account-row-${account.id}`}
                sx={account.active === false ? { opacity: 0.5 } : undefined}
              >
                <TableCell>{account.code}</TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.level}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  {account.parentId ? (idToCode[account.parentId] ?? '—') : '—'}
                </TableCell>
                <TableCell>{account.hasThirdParties ? '✓' : ''}</TableCell>
                <TableCell data-testid={`account-status-${account.id}`}>
                  {account.active === false ? t('accounts.inactive') : t('accounts.active')}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => { setEditTarget(account); setFormOpen(true) }}
                    aria-label={t('common.edit')}
                    data-testid={`edit-account-${account.id}`}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {account.active !== false ? (
                    <IconButton
                      size="small"
                      onClick={() => setDeactivateTarget(account)}
                      aria-label={t('accounts.deactivateTitle')}
                      data-testid={`deactivate-account-${account.id}`}
                    >
                      <BlockIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => setReactivateTarget(account)}
                      aria-label={t('accounts.reactivateTitle')}
                      data-testid={`reactivate-account-${account.id}`}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  )}
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
        workspaceId={workspaceId}
        editAccount={editTarget}
        accounts={accounts ?? []}
      />
      <DeactivateAccountDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        account={deactivateTarget}
        workspaceId={workspaceId}
      />
      <ReactivateAccountDialog
        open={Boolean(reactivateTarget)}
        onClose={() => setReactivateTarget(null)}
        account={reactivateTarget}
        workspaceId={workspaceId}
      />
      <ToggleTpDialog
        open={Boolean(toggleTpTarget)}
        onClose={() => setToggleTpTarget(null)}
        account={toggleTpTarget}
        workspaceId={workspaceId}
      />
    </Box>
  )
}

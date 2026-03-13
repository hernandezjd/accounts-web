import { useState, useEffect, useCallback, useRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import FormHelperText from '@mui/material/FormHelperText'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import { useTranslation } from 'react-i18next'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'
import { translateApiError } from '@/utils/errorUtils'
import { useFormDraft } from '@/hooks/useFormDraft'
import { AccountSearchField, type AccountOption } from './AccountSearchField'
import { ThirdPartySearchField, type ThirdPartyOption } from './ThirdPartySearchField'
import { TransactionTypeSearchField, type TransactionTypeOption } from './TransactionTypeSearchField'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormMode = 'create' | 'createInitialBalance' | 'edit' | 'editInitialBalance'

interface FormItem {
  id: string
  account: AccountOption | null
  thirdParty: ThirdPartyOption | null
  debitAmount: string
  creditAmount: string
}

export interface TransactionFormInitialData {
  transactionTypeId: string
  transactionTypeName: string
  transactionNumber: string
  date: string
  description: string
  items: Array<{
    accountId: string
    accountCode: string
    accountName: string
    hasThirdParties?: boolean
    thirdPartyId?: string | null
    thirdPartyName?: string | null
    debitAmount?: number
    creditAmount?: number
  }>
}

interface TransactionFormProps {
  tenantId: string
  mode: FormMode
  transactionId?: string
  initialData?: TransactionFormInitialData
  onSuccess: () => void
  onCancel: () => void
}

// ─── Draft type ───────────────────────────────────────────────────────────────

interface FormDraft {
  transactionTypeId: string
  transactionTypeName: string
  transactionNumber: string
  date: string
  description: string
  items: Array<{
    id: string
    accountId: string
    accountCode: string
    accountName: string
    hasThirdParties: boolean
    thirdPartyId: string | null
    thirdPartyName: string | null
    debitAmount: string
    creditAmount: string
  }>
}

const EMPTY_DRAFT: FormDraft = {
  transactionTypeId: '',
  transactionTypeName: '',
  transactionNumber: '',
  date: '',
  description: '',
  items: [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEmptyItem(): FormItem {
  return { id: crypto.randomUUID(), account: null, thirdParty: null, debitAmount: '', creditAmount: '' }
}

function parseAmount(s: string): number {
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/** Normalise comma decimal separator to dot before storing in state. */
function normaliseAmountInput(raw: string): string {
  return raw.replace(',', '.')
}

/** Allow only digits and a single decimal separator; block everything else. */
function handleAmountKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  const allowed = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ',',
    'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!allowed.includes(e.key) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
  }
}

/** Strip invalid characters from pasted text. */
function handleAmountPaste(
  e: React.ClipboardEvent<HTMLInputElement>,
  onParsed: (value: string) => void
) {
  e.preventDefault()
  const raw = e.clipboardData.getData('text')
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(',', '.')
  onParsed(cleaned)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionForm({
  tenantId,
  mode,
  transactionId,
  initialData,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { t } = useTranslation()
  const { data: tenantConfig } = useTenantConfig(
    mode === 'create' || mode === 'createInitialBalance' || mode === 'editInitialBalance' ? tenantId : undefined,
  )
  const { data: accounts } = useAccounts(tenantId)
  const { createTransaction, editTransaction, deleteTransaction, createInitialBalance, editInitialBalance, deleteInitialBalance } =
    useTransactionMutations(tenantId)

  // ── Form state ──
  const [selectedType, setSelectedType] = useState<TransactionTypeOption | null>(
    initialData
      ? { id: initialData.transactionTypeId, name: initialData.transactionTypeName }
      : null,
  )
  const [number, setNumber] = useState(initialData?.transactionNumber ?? '')

  // FR-086: pre-fill date with today's date if applicable
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [date, setDate] = useState(() => {
    if (initialData) {
      return initialData.date
    }
    // For create mode, pre-fill with today's date if today >= systemInitialDate
    if (mode === 'create' && tenantConfig?.systemInitialDate) {
      const today = getTodayDate()
      if (today >= tenantConfig.systemInitialDate) {
        return today
      }
    }
    return ''
  })
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [items, setItems] = useState<FormItem[]>(() => {
    if (initialData?.items?.length) {
      return initialData.items.map((item) => ({
        id: crypto.randomUUID(),
        account: {
          id: item.accountId,
          code: item.accountCode,
          name: item.accountName,
          hasThirdParties: item.hasThirdParties ?? false,
        },
        thirdParty:
          item.thirdPartyId && item.thirdPartyName
            ? { id: item.thirdPartyId, name: item.thirdPartyName }
            : null,
        debitAmount: (item.debitAmount ?? 0) > 0 ? String(item.debitAmount) : '',
        creditAmount: (item.creditAmount ?? 0) > 0 ? String(item.creditAmount) : '',
      }))
    }
    return [makeEmptyItem()]
  })

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // ── Draft persistence (create mode only) ────────────────────────────────────
  const isDraftMode = mode === 'create' && !initialData
  const draftKey = `txn-draft-${tenantId}-create`
  const [storedDraft, , clearDraft, hasDraft] = useFormDraft<FormDraft>(draftKey, EMPTY_DRAFT)
  // Once user decides (restore or discard), start auto-saving
  const [draftDecided, setDraftDecided] = useState(!isDraftMode || !hasDraft)
  const [showRestoreBanner, setShowRestoreBanner] = useState(isDraftMode && hasDraft)

  const handleRestoreDraft = useCallback(() => {
    if (storedDraft.transactionTypeId) {
      setSelectedType({ id: storedDraft.transactionTypeId, name: storedDraft.transactionTypeName })
    }
    setNumber(storedDraft.transactionNumber)
    setDate(storedDraft.date)
    setDescription(storedDraft.description)
    if (storedDraft.items.length > 0) {
      setItems(
        storedDraft.items.map((item) => ({
          id: item.id || crypto.randomUUID(),
          account: item.accountId
            ? { id: item.accountId, code: item.accountCode, name: item.accountName, hasThirdParties: item.hasThirdParties }
            : null,
          thirdParty: item.thirdPartyId ? { id: item.thirdPartyId, name: item.thirdPartyName ?? '' } : null,
          debitAmount: item.debitAmount,
          creditAmount: item.creditAmount,
        })),
      )
    }
    setShowRestoreBanner(false)
    setDraftDecided(true)
  }, [storedDraft])

  const handleDiscardDraft = useCallback(() => {
    clearDraft()
    setShowRestoreBanner(false)
    // draftDecided stays false → no auto-save after explicit discard
  }, [clearDraft])

  // Auto-save draft on form changes once decided
  useEffect(() => {
    if (!isDraftMode || !draftDecided) return
    const draft: FormDraft = {
      transactionTypeId: selectedType?.id ?? '',
      transactionTypeName: selectedType?.name ?? '',
      transactionNumber: number,
      date,
      description,
      items: items.map((item) => ({
        id: item.id,
        accountId: item.account?.id ?? '',
        accountCode: item.account?.code ?? '',
        accountName: item.account?.name ?? '',
        hasThirdParties: item.account?.hasThirdParties ?? false,
        thirdPartyId: item.thirdParty?.id ?? null,
        thirdPartyName: item.thirdParty?.name ?? null,
        debitAmount: item.debitAmount,
        creditAmount: item.creditAmount,
      })),
    }
    try {
      sessionStorage.setItem(`form-draft:${draftKey}`, JSON.stringify(draft))
    } catch {
      // ignore storage errors
    }
  }, [isDraftMode, draftDecided, selectedType, number, date, description, items, draftKey])

  // ── Sync hasThirdParties from accounts list (edit mode) ──
  const accountsSyncedRef = useRef(false)
  useEffect(() => {
    if (!accounts || accountsSyncedRef.current || !initialData) return
    accountsSyncedRef.current = true
    setItems((prev) =>
      prev.map((item) => {
        if (!item.account) return item
        const found = accounts.find((a) => a.id === item.account!.id)
        if (!found) return item
        return { ...item, account: { ...item.account, hasThirdParties: found.hasThirdParties ?? false } }
      }),
    )
  }, [accounts, initialData])

  // ── REQ-INIT-09: initial date guard (create mode only) ──
  const initialDateMissing = mode === 'create' && !tenantConfig?.systemInitialDate

  // ── FR-070: date-before-initial-date validation (regular transaction modes) ──
  const systemInitialDate = tenantConfig?.systemInitialDate ?? null
  const isRegularMode = mode === 'create' || mode === 'edit'
  const dateBeforeInitialDate =
    isRegularMode && !!date && !!systemInitialDate && date < systemInitialDate

  // ── Totals ──
  const totalDebits = items.reduce((sum, item) => sum + parseAmount(item.debitAmount), 0)
  const totalCredits = items.reduce((sum, item) => sum + parseAmount(item.creditAmount), 0)
  const isBalanced = totalDebits > 0 && Math.abs(totalDebits - totalCredits) < 0.001

  // ── Item mutations ──
  const addItem = () => setItems((prev) => [...prev, makeEmptyItem()])

  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))

  const insertAbove = (id: string) =>
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx, 0, makeEmptyItem())
      return next
    })

  const insertBelow = (id: string) =>
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx + 1, 0, makeEmptyItem())
      return next
    })

  const updateItem = (id: string, patch: Partial<FormItem>) =>
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              // Clear third party when account changes
              ...('account' in patch && { thirdParty: null }),
            }
          : item,
      ),
    )

  // ── Build request items ──
  const buildRequestItems = () =>
    items.map((item) => ({
      accountId: item.account!.id,
      thirdPartyId: item.thirdParty?.id ?? undefined,
      debitAmount: parseAmount(item.debitAmount) > 0 ? parseAmount(item.debitAmount) : undefined,
      creditAmount: parseAmount(item.creditAmount) > 0 ? parseAmount(item.creditAmount) : undefined,
    }))

  // ── Save ──
  const isRegularTransactionMode = mode === 'create' || mode === 'edit'
  const isInitialBalanceMode = mode === 'createInitialBalance' || mode === 'editInitialBalance'
  const canSave =
    !initialDateMissing &&
    !dateBeforeInitialDate &&
    isBalanced &&
    number.trim() &&
    description.trim() &&
    (isInitialBalanceMode || (selectedType && date)) &&
    items.every((item) => item.account && (parseAmount(item.debitAmount) > 0 || parseAmount(item.creditAmount) > 0))

  const handleSave = () => {
    setErrorMsg(null)
    const requestItems = buildRequestItems()

    if (mode === 'create') {
      createTransaction.mutate(
        {
          transactionTypeId: selectedType!.id,
          transactionNumber: number,
          date,
          description,
          items: requestItems,
        },
        {
          onSuccess: () => { clearDraft(); onSuccess() },
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    } else if (mode === 'createInitialBalance') {
      createInitialBalance.mutate(
        { transactionNumber: number, description, items: requestItems },
        {
          onSuccess: () => onSuccess(),
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    } else if (mode === 'editInitialBalance') {
      editInitialBalance.mutate(
        {
          id: transactionId!,
          body: { transactionNumber: number, description, items: requestItems },
        },
        {
          onSuccess: () => onSuccess(),
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    } else if (mode === 'edit') {
      editTransaction.mutate(
        {
          id: transactionId!,
          body: {
            transactionTypeId: selectedType!.id,
            transactionNumber: number,
            date,
            description,
            items: requestItems,
          },
        },
        {
          onSuccess: () => onSuccess(),
          onError: (err) => setErrorMsg(translateApiError(err, t)),
        },
      )
    }
  }

  // ── Delete ──
  const handleDeleteConfirm = () => {
    setErrorMsg(null)
    if (mode === 'editInitialBalance') {
      deleteInitialBalance.mutate(transactionId!, {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          onSuccess()
        },
        onError: (err) => {
          setDeleteDialogOpen(false)
          setErrorMsg(translateApiError(err, t))
        },
      })
    } else {
      deleteTransaction.mutate(transactionId!, {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          onSuccess()
        },
        onError: (err) => {
          setDeleteDialogOpen(false)
          setErrorMsg(translateApiError(err, t))
        },
      })
    }
  }

  const isSaving =
    createTransaction.isPending ||
    editTransaction.isPending ||
    createInitialBalance.isPending ||
    editInitialBalance.isPending

  // ── Render ──
  return (
    <Box
      sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
      data-testid="transaction-form"
    >
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        {mode === 'edit'
          ? t('transactionForm.editTransaction')
          : mode === 'createInitialBalance'
            ? t('transactionForm.newInitialBalance')
            : mode === 'editInitialBalance'
              ? t('transactionForm.editInitialBalance')
              : t('transactionForm.newTransaction')}
      </Typography>

      {showRestoreBanner && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <>
              <Button color="inherit" size="small" onClick={handleRestoreDraft}>
                {t('transactionForm.draftRestore')}
              </Button>
              <Button color="inherit" size="small" onClick={handleDiscardDraft}>
                {t('transactionForm.draftDiscard')}
              </Button>
            </>
          }
        >
          {t('transactionForm.draftBannerMessage')}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        {/* Type — hidden for initial balance modes */}
        {mode !== 'createInitialBalance' && mode !== 'editInitialBalance' && (
          <TransactionTypeSearchField
            value={selectedType}
            onChange={(v) => setSelectedType(v)}
          />
        )}

        <TextField
          label={t('transactionForm.transactionNumber')}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
          size="small"
          sx={{ minWidth: 160 }}
        />

        {/* Date — read-only for initial balance modes */}
        {mode === 'createInitialBalance' || mode === 'editInitialBalance' ? (
          <TextField
            label={t('transactionForm.initialBalanceDate')}
            value={tenantConfig?.systemInitialDate ?? ''}
            size="small"
            sx={{ minWidth: 160 }}
            inputProps={{ readOnly: true }}
            data-testid="initial-balance-date"
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <TextField
              label={t('transactionForm.date')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              size="small"
              sx={{ minWidth: 160 }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: systemInitialDate ?? undefined }}
              error={dateBeforeInitialDate}
              data-testid="date-field"
            />
            {dateBeforeInitialDate && (
              <FormHelperText error data-testid="date-before-initial-date-error">
                {t('transactionForm.dateBeforeInitialDate', { date: systemInitialDate })}
              </FormHelperText>
            )}
          </Box>
        )}

        <TextField
          label={t('transactionForm.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          size="small"
          sx={{ minWidth: 240, flexGrow: 1 }}
        />
      </Box>

      {/* Line items */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
            {t('transactionForm.items')}
          </Typography>
          <Typography variant="body2" sx={{ width: 110, textAlign: 'center', color: 'text.secondary' }}>
            {t('transactionForm.debit')}
          </Typography>
          <Typography variant="body2" sx={{ width: 110, textAlign: 'center', color: 'text.secondary' }}>
            {t('transactionForm.credit')}
          </Typography>
          <Box sx={{ width: 84 }} />
        </Box>

        {items.map((item) => (
          <Box
            key={item.id}
            sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}
            data-testid="form-item-row"
          >
            <Box sx={{ minWidth: 240, flexGrow: 1 }}>
              <AccountSearchField
                tenantId={tenantId}
                value={item.account}
                onChange={(account) => updateItem(item.id, { account })}
              />
            </Box>

            {item.account?.hasThirdParties && (
              <Box sx={{ minWidth: 200, flexGrow: 1 }}>
                <ThirdPartySearchField
                  tenantId={tenantId}
                  value={item.thirdParty}
                  onChange={(thirdParty) => updateItem(item.id, { thirdParty })}
                />
              </Box>
            )}

            <TextField
              value={item.debitAmount}
              onChange={(e) =>
                updateItem(item.id, {
                  debitAmount: normaliseAmountInput(e.target.value),
                  creditAmount: '',
                })
              }
              onKeyDown={handleAmountKeyDown}
              onPaste={(e) =>
                handleAmountPaste(e, (v) =>
                  updateItem(item.id, { debitAmount: v, creditAmount: '' })
                )
              }
              size="small"
              sx={{ width: 110 }}
              inputProps={{ style: { textAlign: 'right' }, inputMode: 'decimal' }}
              data-testid="debit-input"
            />

            <TextField
              value={item.creditAmount}
              onChange={(e) =>
                updateItem(item.id, {
                  creditAmount: normaliseAmountInput(e.target.value),
                  debitAmount: '',
                })
              }
              onKeyDown={handleAmountKeyDown}
              onPaste={(e) =>
                handleAmountPaste(e, (v) =>
                  updateItem(item.id, { creditAmount: v, debitAmount: '' })
                )
              }
              size="small"
              sx={{ width: 110 }}
              inputProps={{ style: { textAlign: 'right' }, inputMode: 'decimal' }}
              data-testid="credit-input"
            />

            <Tooltip title={t('transactionForm.insertAbove')}>
              <IconButton size="small" onClick={() => insertAbove(item.id)}
                aria-label={t('transactionForm.insertAbove')} data-testid="insert-above-btn">
                <KeyboardArrowUp fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('transactionForm.insertBelow')}>
              <IconButton size="small" onClick={() => insertBelow(item.id)}
                aria-label={t('transactionForm.insertBelow')} data-testid="insert-below-btn">
                <KeyboardArrowDown fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('transactionForm.removeItem')}>
              <span>
                <IconButton size="small" onClick={() => removeItem(item.id)}
                  aria-label={t('transactionForm.removeItem')}
                  disabled={items.length === 1} data-testid="remove-item-btn">
                  <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ))}

        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={addItem}
          sx={{ mt: 0.5 }}
        >
          {t('transactionForm.addItem')}
        </Button>
      </Box>

      {/* Totals + balance indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          {(totalDebits > 0 || totalCredits > 0) && (
            <Chip
              label={isBalanced ? t('transactionForm.balanced') : t('transactionForm.unbalanced')}
              color={isBalanced ? 'success' : 'error'}
              size="small"
              data-testid="balance-chip"
            />
          )}
        </Box>
        <Box sx={{ width: 110, borderTop: 1, borderColor: 'divider', pt: 0.5 }}>
          <Typography sx={{ fontSize: '1rem', textAlign: 'right', pr: '14px' }}>
            {parseFloat(totalDebits.toFixed(2))}
          </Typography>
        </Box>
        <Box sx={{ width: 110, borderTop: 1, borderColor: 'divider', pt: 0.5 }}>
          <Typography sx={{ fontSize: '1rem', textAlign: 'right', pr: '14px' }}>
            {parseFloat(totalCredits.toFixed(2))}
          </Typography>
        </Box>
        <Box sx={{ width: 84 }} />
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSave || isSaving}
        >
          {t('common.save')}
        </Button>
        <Button onClick={() => { clearDraft(); onCancel() }}>{t('common.cancel')}</Button>
        {(mode === 'edit' || mode === 'editInitialBalance') && (
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={mode === 'editInitialBalance' ? deleteInitialBalance.isPending : deleteTransaction.isPending}
            sx={{ ml: 'auto' }}
          >
            {t('transactionForm.deleteTransaction')}
          </Button>
        )}
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('transactionForm.confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('transactionForm.confirmDelete')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteTransaction.isPending}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

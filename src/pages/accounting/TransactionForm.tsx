import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import { useTranslation } from 'react-i18next'
import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'
import { translateApiError } from '@/utils/errorUtils'
import { useFormDraft } from '@/hooks/useFormDraft'
import { AccountSearchField, type AccountOption } from './AccountSearchField'
import { ThirdPartySearchField, type ThirdPartyOption } from './ThirdPartySearchField'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormMode = 'create' | 'createInitialBalance' | 'edit'

interface FormItem {
  id: string
  account: AccountOption | null
  thirdParty: ThirdPartyOption | null
  side: 'debit' | 'credit'
  amount: string
}

interface TransactionTypeOption {
  id: string
  name: string
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
    side: 'debit' | 'credit'
    amount: string
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
  return { id: crypto.randomUUID(), account: null, thirdParty: null, side: 'debit', amount: '' }
}

function parseAmount(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
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
  const { data: transactionTypes } = useTransactionTypes()
  const { data: tenantConfig } = useTenantConfig(mode === 'createInitialBalance' ? tenantId : undefined)
  const { createTransaction, editTransaction, deleteTransaction, createInitialBalance } =
    useTransactionMutations(tenantId)

  // ── Form state ──
  const [selectedType, setSelectedType] = useState<TransactionTypeOption | null>(
    initialData
      ? { id: initialData.transactionTypeId, name: initialData.transactionTypeName }
      : null,
  )
  const [number, setNumber] = useState(initialData?.transactionNumber ?? '')
  const [date, setDate] = useState(initialData?.date ?? '')
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
        side: (item.debitAmount ?? 0) > 0 ? 'debit' : 'credit',
        amount: String((item.debitAmount ?? 0) > 0 ? item.debitAmount : (item.creditAmount ?? '')),
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
          side: item.side,
          amount: item.amount,
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
        side: item.side,
        amount: item.amount,
      })),
    }
    try {
      sessionStorage.setItem(`form-draft:${draftKey}`, JSON.stringify(draft))
    } catch {
      // ignore storage errors
    }
  }, [isDraftMode, draftDecided, selectedType, number, date, description, items, draftKey])

  // Reset type if transaction types load and we're in create mode
  useEffect(() => {
    if (mode === 'create' && !initialData && transactionTypes?.length && !selectedType) {
      // Leave null – user must select
    }
  }, [mode, initialData, transactionTypes, selectedType])

  // ── Totals ──
  const totalDebits = items.reduce(
    (sum, item) => (item.side === 'debit' ? sum + parseAmount(item.amount) : sum),
    0,
  )
  const totalCredits = items.reduce(
    (sum, item) => (item.side === 'credit' ? sum + parseAmount(item.amount) : sum),
    0,
  )
  const isBalanced = totalDebits > 0 && Math.abs(totalDebits - totalCredits) < 0.001

  // ── Item mutations ──
  const addItem = () => setItems((prev) => [...prev, makeEmptyItem()])

  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))

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
      debitAmount: item.side === 'debit' ? parseAmount(item.amount) : undefined,
      creditAmount: item.side === 'credit' ? parseAmount(item.amount) : undefined,
    }))

  // ── Save ──
  const canSave =
    isBalanced &&
    number.trim() &&
    (mode === 'createInitialBalance' || (selectedType && date)) &&
    items.every((item) => item.account && parseAmount(item.amount) > 0)

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

  const isSaving =
    createTransaction.isPending ||
    editTransaction.isPending ||
    createInitialBalance.isPending

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
        {/* Type — hidden for initial balance */}
        {mode !== 'createInitialBalance' && (
          <Autocomplete<TransactionTypeOption>
            options={(transactionTypes ?? []).map((tt) => ({ id: tt.id!, name: tt.name! }))}
            value={selectedType}
            onChange={(_, v) => setSelectedType(v)}
            getOptionLabel={(opt) => opt.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('transactionForm.transactionType')}
                required
                size="small"
              />
            )}
            sx={{ minWidth: 200 }}
            size="small"
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

        {/* Date — read-only for initial balance */}
        {mode === 'createInitialBalance' ? (
          <TextField
            label={t('transactionForm.initialBalanceDate')}
            value={tenantConfig?.systemInitialDate ?? ''}
            size="small"
            sx={{ minWidth: 160 }}
            inputProps={{ readOnly: true }}
            data-testid="initial-balance-date"
          />
        ) : (
          <TextField
            label={t('transactionForm.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            size="small"
            sx={{ minWidth: 160 }}
            InputLabelProps={{ shrink: true }}
          />
        )}

        <TextField
          label={t('transactionForm.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
          sx={{ minWidth: 240, flexGrow: 1 }}
        />
      </Box>

      {/* Line items */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {t('transactionForm.items')}
        </Typography>

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

            <ToggleButtonGroup
              value={item.side}
              exclusive
              onChange={(_, v) => v && updateItem(item.id, { side: v })}
              size="small"
              aria-label={t('transactionForm.debitOrCredit')}
            >
              <ToggleButton value="debit">{t('transactionForm.debit')}</ToggleButton>
              <ToggleButton value="credit">{t('transactionForm.credit')}</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label={t('transactionForm.amount')}
              value={item.amount}
              onChange={(e) => updateItem(item.id, { amount: e.target.value })}
              type="number"
              size="small"
              sx={{ width: 120 }}
              inputProps={{ min: 0, step: 0.01 }}
            />

            <IconButton
              size="small"
              onClick={() => removeItem(item.id)}
              aria-label={t('transactionForm.removeItem')}
              disabled={items.length === 1}
            >
              <RemoveCircleOutlineIcon fontSize="small" />
            </IconButton>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2">
          {t('transactionForm.totalDebits')}: <strong>{totalDebits.toFixed(2)}</strong>
        </Typography>
        <Typography variant="body2">
          {t('transactionForm.totalCredits')}: <strong>{totalCredits.toFixed(2)}</strong>
        </Typography>
        <Chip
          label={isBalanced ? t('transactionForm.balanced') : t('transactionForm.unbalanced')}
          color={isBalanced ? 'success' : 'error'}
          size="small"
          data-testid="balance-chip"
        />
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
        {mode === 'edit' && (
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteTransaction.isPending}
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

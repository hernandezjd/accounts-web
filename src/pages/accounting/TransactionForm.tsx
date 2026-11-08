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
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'
import { PREFERENCE_KEYS } from '@/utils/preferences'
import { currencyDecimals, formatMoney } from '@/utils/money'
import MenuItem from '@mui/material/MenuItem'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useFormDraft } from '@/hooks/useFormDraft'
import { useErrorHandler } from '@accounts/error-handling-web'
import { ErrorMessage } from '@/components/error/ErrorMessage'
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
  /** ISO 4217 currency of the amount; empty = the base currency (REQ-CUR-05). */
  currency: string
  /** Base units per unit of `currency`; only used when the currency is not the base one. */
  rate: string
  /** Optional base amount typed by the user; empty = amount x rate (REQ-CUR-06). */
  baseAmount: string
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
    currency?: string
    rate?: number
    baseAmount?: number
  }>
}

interface TransactionFormProps {
  workspaceId: string
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
    currency?: string
    rate?: string
    baseAmount?: string
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
  return {
    id: crypto.randomUUID(),
    account: null,
    thirdParty: null,
    debitAmount: '',
    creditAmount: '',
    currency: '',
    rate: '',
    baseAmount: '',
  }
}

function parseAmount(s: string): number {
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/** Rounds to the decimals of a currency, working in minor units to avoid float noise (2.675 x 100). */
function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round((n + Number.EPSILON * Math.sign(n)) * factor) / factor
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
  e: React.ClipboardEvent<HTMLElement>,
  onParsed: (value: string) => void
) {
  e.preventDefault()
  const raw = e.clipboardData.getData('text')
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(',', '.')
  onParsed(cleaned)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionForm({
  workspaceId,
  mode,
  transactionId,
  initialData,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { t } = useTranslation()
  const { data: workspaceConfig } = useWorkspaceConfig(workspaceId)
  const baseCurrency = workspaceConfig?.baseCurrency ?? ''
  const baseDecimals = currencyDecimals(baseCurrency)
  const { data: accounts } = useAccounts(workspaceId)
  const { createTransaction, editTransaction, deleteTransaction, createInitialBalance, editInitialBalance, deleteInitialBalance } =
    useTransactionMutations(workspaceId)

  // ── UI Preferences persistence (localStorage) ──────────────────────────────
  const [lastUsedDate, setLastUsedDate] = useLocalStorage<string>(PREFERENCE_KEYS.TRANSACTION_LAST_DATE, '')

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
    // For create mode, try to use the last used date if valid
    if (mode === 'create' && lastUsedDate && workspaceConfig?.systemInitialDate) {
      if (lastUsedDate >= workspaceConfig.systemInitialDate) {
        return lastUsedDate
      }
    }
    // Fall back to today's date if applicable
    if (mode === 'create' && workspaceConfig?.systemInitialDate) {
      const today = getTodayDate()
      if (today >= workspaceConfig.systemInitialDate) {
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
        currency: item.currency ?? '',
        rate: item.currency && item.rate && item.rate !== 1 ? String(item.rate) : '',
        baseAmount: item.currency && item.baseAmount ? String(item.baseAmount) : '',
      }))
    }
    return [makeEmptyItem()]
  })

  const { error, handleError, clearError } = useErrorHandler()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // ── Draft persistence (create mode only) ────────────────────────────────────
  const isDraftMode = mode === 'create' && !initialData
  const draftKey = `txn-draft-${workspaceId}-create`
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
          currency: item.currency ?? '',
          rate: item.rate ?? '',
          baseAmount: item.baseAmount ?? '',
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
        currency: item.currency,
        rate: item.rate,
        baseAmount: item.baseAmount,
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
  const initialDateMissing = mode === 'create' && !workspaceConfig?.systemInitialDate

  // ── FR-070: date-before-initial-date validation (regular transaction modes) ──
  const systemInitialDate = workspaceConfig?.systemInitialDate ?? null
  const isRegularMode = mode === 'create' || mode === 'edit'
  const dateBeforeInitialDate =
    isRegularMode && !!date && !!systemInitialDate && date < systemInitialDate

  // ── Totals ──
  // A transaction balances in base currency (REQ-TXN-09): every item counts with its base amount
  const accountCurrencies = (accountId: string | undefined): string[] =>
    (accounts?.find((a) => a.id === accountId)?.currencies ?? []).slice()
  const isForeign = (item: FormItem) => !!item.currency && !!baseCurrency && item.currency !== baseCurrency
  const amountOf = (item: FormItem) => parseAmount(item.debitAmount) || parseAmount(item.creditAmount)
  /** Base amount of an item: the one typed by the user, or amount x rate rounded to the base decimals. */
  const baseAmountOf = (item: FormItem): number => {
    const amount = amountOf(item)
    if (!isForeign(item)) return amount
    const typed = parseAmount(item.baseAmount)
    if (typed > 0) return typed
    return roundTo(amount * parseAmount(item.rate), baseDecimals)
  }
  const totalDebits = roundTo(
    items.reduce((sum, item) => sum + (parseAmount(item.debitAmount) > 0 ? baseAmountOf(item) : 0), 0),
    baseDecimals,
  )
  const totalCredits = roundTo(
    items.reduce((sum, item) => sum + (parseAmount(item.creditAmount) > 0 ? baseAmountOf(item) : 0), 0),
    baseDecimals,
  )
  const isBalanced = totalDebits > 0 && Math.abs(totalDebits - totalCredits) < 0.5 * 10 ** -baseDecimals

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
              // Clear third party and currency choice when account changes
              ...('account' in patch && { thirdParty: null, currency: '', rate: '', baseAmount: '' }),
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
      // Items in the base currency go without currency and rate: the server defaults them (REQ-CUR-06)
      ...(isForeign(item)
        ? { currency: item.currency, rate: parseAmount(item.rate), baseAmount: baseAmountOf(item) }
        : {}),
    }))

  // ── Save ──
  const isInitialBalanceMode = mode === 'createInitialBalance' || mode === 'editInitialBalance'
  const canSave =
    !initialDateMissing &&
    !dateBeforeInitialDate &&
    isBalanced &&
    number.trim() &&
    description.trim() &&
    (isInitialBalanceMode || (selectedType && date)) &&
    items.every((item) => item.account && (parseAmount(item.debitAmount) > 0 || parseAmount(item.creditAmount) > 0)) &&
    items.every((item) => !isForeign(item) || parseAmount(item.rate) > 0)

  const handleSave = () => {
    clearError()
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
          onSuccess: () => {
            // Remember the last used date for next transaction
            setLastUsedDate(date)
            clearDraft()
            onSuccess()
          },
          onError: (err) => handleError(err),
        },
      )
    } else if (mode === 'createInitialBalance') {
      createInitialBalance.mutate(
        { transactionNumber: number, description, items: requestItems },
        {
          onSuccess: () => onSuccess(),
          onError: (err) => handleError(err),
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
          onError: (err) => handleError(err),
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
          onError: (err) => handleError(err),
        },
      )
    }
  }

  // ── Delete ──
  const handleDeleteConfirm = () => {
    clearError()
    if (mode === 'editInitialBalance') {
      deleteInitialBalance.mutate(transactionId!, {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          onSuccess()
        },
        onError: (err) => {
          setDeleteDialogOpen(false)
          handleError(err)
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
          handleError(err)
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

      <ErrorMessage error={error} onDismiss={clearError} />

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
            value={workspaceConfig?.systemInitialDate ?? ''}
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
          <Typography variant="body2" sx={{ fontWeight: 600, flex: '1 1 240px' }}>
            {t('transactionForm.items')}
          </Typography>
          <Typography variant="body2" sx={{ width: 90, textAlign: 'center', color: 'text.secondary' }}>
            {t('currency.currency')}
          </Typography>
          <Typography variant="body2" sx={{ width: 110, textAlign: 'center', color: 'text.secondary' }}>
            {t('transactionForm.debit')}
          </Typography>
          <Typography variant="body2" sx={{ width: 110, textAlign: 'center', color: 'text.secondary' }}>
            {t('transactionForm.credit')}
          </Typography>
          <Box sx={{ width: 106 }} />
        </Box>

        {items.map((item) => (
          <Box
            key={item.id}
            sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}
            data-testid="form-item-row"
          >
            <Box sx={{ minWidth: 240, flexGrow: 1 }}>
              <AccountSearchField
                workspaceId={workspaceId}
                value={item.account}
                onChange={(account) => updateItem(item.id, { account })}
              />
            </Box>

            {item.account?.hasThirdParties && (
              <Box sx={{ minWidth: 200, flexGrow: 1 }}>
                <ThirdPartySearchField
                  workspaceId={workspaceId}
                  value={item.thirdParty}
                  onChange={(thirdParty) => updateItem(item.id, { thirdParty })}
                />
              </Box>
            )}

            <TextField
              select
              value={item.currency || baseCurrency}
              onChange={(e) => updateItem(item.id, { currency: e.target.value, rate: '', baseAmount: '' })}
              size="small"
              sx={{ width: 90 }}
              disabled={!baseCurrency || accountCurrencies(item.account?.id).length < 2}
              inputProps={{ 'aria-label': t('currency.currency') }}
              data-testid="currency-select"
            >
              {(accountCurrencies(item.account?.id).length > 0
                ? accountCurrencies(item.account?.id)
                : [baseCurrency]
              ).map((code) => (
                <MenuItem key={code} value={code}>
                  {code}
                </MenuItem>
              ))}
            </TextField>

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

            {isForeign(item) && (
              <>
                <TextField
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, { rate: normaliseAmountInput(e.target.value) })}
                  onKeyDown={handleAmountKeyDown}
                  label={t('currency.rate')}
                  helperText={t('currency.rateHelp', { base: baseCurrency, currency: item.currency })}
                  size="small"
                  sx={{ width: 130 }}
                  inputProps={{ style: { textAlign: 'right' }, inputMode: 'decimal' }}
                  data-testid="rate-input"
                />
                <TextField
                  value={item.baseAmount}
                  onChange={(e) => updateItem(item.id, { baseAmount: normaliseAmountInput(e.target.value) })}
                  onKeyDown={handleAmountKeyDown}
                  label={t('currency.baseAmount')}
                  placeholder={formatMoney(
                    roundTo(amountOf(item) * parseAmount(item.rate), baseDecimals),
                    baseCurrency,
                  )}
                  size="small"
                  sx={{ width: 130 }}
                  inputProps={{ style: { textAlign: 'right' }, inputMode: 'decimal' }}
                  data-testid="base-amount-input"
                />
              </>
            )}

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
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{ flex: '1 1 240px' }} />
        <Box sx={{ width: 110, borderTop: 1, borderColor: 'divider', pt: 0.5 }}>
          <Typography sx={{ fontSize: '1rem', textAlign: 'right', pr: '14px' }}>
            {formatMoney(totalDebits, baseCurrency)}
          </Typography>
        </Box>
        <Box sx={{ width: 110, borderTop: 1, borderColor: 'divider', pt: 0.5 }}>
          <Typography sx={{ fontSize: '1rem', textAlign: 'right', pr: '14px' }}>
            {formatMoney(totalCredits, baseCurrency)}
          </Typography>
        </Box>
        <Box sx={{ width: 106 }} />
        {(totalDebits > 0 || totalCredits > 0) && (
          <Chip
            label={isBalanced ? t('transactionForm.balanced') : t('transactionForm.unbalanced')}
            color={isBalanced ? 'success' : 'error'}
            size="small"
            data-testid="balance-chip"
            sx={{ position: 'absolute', right: 0 }}
          />
        )}
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

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
import InputAdornment from '@mui/material/InputAdornment'
import DeleteIcon from '@mui/icons-material/Delete'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import { useTranslation } from 'react-i18next'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'
import { PREFERENCE_KEYS } from '@/utils/preferences'
import { formatMoney, formatRate, isInvertedRate, toStoredRate } from '@/utils/money'
import { useExchangeRates } from '@/hooks/api/useExchangeRates'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useFormDraft } from '@/hooks/useFormDraft'
import { useErrorHandler } from '@accounts/error-handling-web'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import type { components as TxnCmd } from '@/api/generated/transaction-command-api'
import { AccountSearchField, type AccountOption } from './AccountSearchField'
import { ThirdPartySearchField, type ThirdPartyOption } from './ThirdPartySearchField'
import { TransactionTypeSearchField, type TransactionTypeOption } from './TransactionTypeSearchField'

// ─── Types ────────────────────────────────────────────────────────────────────

type ValuationPreview = TxnCmd['schemas']['ValuationPreviewResponse']

export type FormMode = 'create' | 'createInitialBalance' | 'edit' | 'editInitialBalance'

interface FormItem {
  id: string
  account: AccountOption | null
  thirdParty: ThirdPartyOption | null
  debitAmount: string
  creditAmount: string
  /** Exact amounts typed for the other tracked currencies (mode EXACT_AMOUNTS, MC-15), by currency. */
  equivalents: Record<string, string>
}

type ValuationMode = 'RATES' | 'RATE_TABLE' | 'EXACT_AMOUNTS'

/** What a stored transaction was valued with (MC-18): an edit reuses it (MC-26). */
export interface StoredValuation {
  mode: ValuationMode
  rates: Array<{ currency: string; rate: number }>
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
    equivalents?: Array<{ currency: string; amount: number }>
  }>
  valuation?: StoredValuation | null
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
    equivalents?: Record<string, string>
  }>
  valuationMode?: ValuationMode
  rates?: Record<string, string>
  ratesInverted?: Record<string, boolean>
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
    equivalents: {},
  }
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
  const { data: accounts } = useAccounts(workspaceId)
  const { createTransaction, previewValuation, editTransaction, deleteTransaction, createInitialBalance, editInitialBalance, deleteInitialBalance } =
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
        equivalents: Object.fromEntries((item.equivalents ?? []).map((e) => [e.currency, String(e.amount)])),
      }))
    }
    return [makeEmptyItem()]
  })

  // ── Valuation (MC-15): how the equivalents in the other tracked currencies are obtained ──
  const isEditMode = mode === 'edit' || mode === 'editInitialBalance'
  const [valuationMode, setValuationMode] = useState<ValuationMode>(initialData?.valuation?.mode ?? 'RATE_TABLE')
  const [rates, setRates] = useState<Record<string, string>>(() =>
    Object.fromEntries((initialData?.valuation?.rates ?? []).map((r) => [r.currency, String(r.rate)])),
  )
  // Stored rates come in the stored direction
  const [ratesInverted, setRatesInverted] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((initialData?.valuation?.rates ?? []).map((r) => [r.currency, false])),
  )
  const [preview, setPreview] = useState<ValuationPreview | null>(null)

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
          equivalents: item.equivalents ?? {},
        })),
      )
    }
    if (storedDraft.valuationMode) setValuationMode(storedDraft.valuationMode)
    if (storedDraft.rates) setRates(storedDraft.rates)
    if (storedDraft.ratesInverted) setRatesInverted(storedDraft.ratesInverted)
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
        equivalents: item.equivalents,
      })),
      valuationMode,
      rates,
      ratesInverted,
    }
    try {
      sessionStorage.setItem(`form-draft:${draftKey}`, JSON.stringify(draft))
    } catch {
      // ignore storage errors
    }
  }, [isDraftMode, draftDecided, selectedType, number, date, description, items, valuationMode, rates, ratesInverted, draftKey])

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

  // ── Currencies of the lines (MC-01, MC-06) ──
  // A line is always in the native currency of its account; the account's other tracked currencies get derived
  // equivalents. A transaction needs one rate per non-base currency involved (MC-16).
  const accountOf = (accountId: string | undefined) => accounts?.find((a) => a.id === accountId)
  const nativeOf = (item: FormItem): string => accountOf(item.account?.id)?.nativeCurrency || baseCurrency
  const trackedOf = (item: FormItem): string[] => {
    const tracked = accountOf(item.account?.id)?.currencies ?? []
    return tracked.length > 0 ? tracked : [nativeOf(item)]
  }
  const equivalentCurrenciesOf = (item: FormItem): string[] => trackedOf(item).filter((c) => c !== nativeOf(item))
  const involvedCurrencies = Array.from(
    new Set(items.flatMap((item) => (item.account ? [nativeOf(item), ...trackedOf(item)] : []))),
  ).filter((c) => c && c !== baseCurrency)
  const needsValuation = items.some((item) => item.account && equivalentCurrenciesOf(item).length > 0)
  // An edit keeps the stored rates (MC-26); only exact amounts are typed again
  const ratesEditable = !(isEditMode && initialData?.valuation)
  const showRateInputs = needsValuation && valuationMode === 'RATES' && ratesEditable
  const showExactGrid = needsValuation && valuationMode === 'EXACT_AMOUNTS'

  // A rate is typed in its readable direction (see isInvertedRate): the latest rate of the table tells which one it
  // is, and the user can switch it. Typing fixes the direction, so a table that loads late does not reinterpret it.
  const { data: tableRates } = useExchangeRates({ base: baseCurrency })
  const isRateInverted = (currency: string): boolean =>
    ratesInverted[currency] ??
    isInvertedRate(
      tableRates?.find((r) => r.currency === currency && r.baseCurrency === baseCurrency && !r.superseded)?.rate,
    )
  const storedRateOf = (currency: string): number =>
    toStoredRate(parseAmount(rates[currency] ?? ''), isRateInverted(currency))

  // ── Totals: per native currency, as entered. The balance in base and in the required currencies depends on the
  // valuation, so the server (or the preview) decides it.
  const amountOf = (item: FormItem) => parseAmount(item.debitAmount) || parseAmount(item.creditAmount)
  const totalsByCurrency = (() => {
    const totals = new Map<string, { debit: number; credit: number }>()
    for (const item of items) {
      const total = totals.get(nativeOf(item)) ?? { debit: 0, credit: 0 }
      total.debit += parseAmount(item.debitAmount)
      total.credit += parseAmount(item.creditAmount)
      totals.set(nativeOf(item), total)
    }
    return [...totals.entries()]
  })()
  const anyAmount = items.some((item) => amountOf(item) > 0)
  // Without equivalents everything is in one currency and the check is local; otherwise the preview answers
  const isBalanced = needsValuation
    ? preview !== null
    : anyAmount && totalsByCurrency.every(([, total]) => Math.abs(total.debit - total.credit) < 0.000001)

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
              ...('account' in patch && { thirdParty: null, equivalents: {} }),
            }
          : item,
      ),
    )

  // A preview describes the inputs it was made from
  const [previewInputs, setPreviewInputs] = useState({ items, rates, valuationMode, date })
  if (
    previewInputs.items !== items ||
    previewInputs.rates !== rates ||
    previewInputs.valuationMode !== valuationMode ||
    previewInputs.date !== date
  ) {
    setPreviewInputs({ items, rates, valuationMode, date })
    setPreview(null)
  }

  // ── Build request ──
  const buildRequestItems = () =>
    items.map((item) => ({
      accountId: item.account!.id,
      thirdPartyId: item.thirdParty?.id ?? undefined,
      debitAmount: parseAmount(item.debitAmount) > 0 ? parseAmount(item.debitAmount) : undefined,
      creditAmount: parseAmount(item.creditAmount) > 0 ? parseAmount(item.creditAmount) : undefined,
      ...(showExactGrid
        ? {
            equivalents: equivalentCurrenciesOf(item).map((currency) => ({
              currency,
              amount: parseAmount(item.equivalents[currency] ?? ''),
            })),
          }
        : {}),
    }))

  const buildValuation = () => {
    if (!needsValuation) return undefined
    if (isEditMode && initialData?.valuation && valuationMode !== 'EXACT_AMOUNTS') return undefined // stored rates are reused
    if (valuationMode === 'RATES') {
      return {
        mode: 'RATES' as const,
        rates: involvedCurrencies.map((currency) => ({ currency, rate: storedRateOf(currency) })),
      }
    }
    return { mode: valuationMode }
  }

  const handlePreview = () => {
    clearError()
    setPreview(null)
    previewValuation.mutate(
      {
        transactionTypeId: selectedType!.id,
        transactionNumber: number,
        date,
        description,
        items: buildRequestItems(),
        valuation: buildValuation(),
      },
      {
        onSuccess: (data) => setPreview((data ?? { items: [] }) as ValuationPreview),
        onError: (err) => handleError(err),
      },
    )
  }

  // ── Save ──
  const isInitialBalanceMode = mode === 'createInitialBalance' || mode === 'editInitialBalance'
  const canSave =
    !initialDateMissing &&
    !dateBeforeInitialDate &&
    (needsValuation || isBalanced) &&
    number.trim() &&
    description.trim() &&
    (isInitialBalanceMode || (selectedType && date)) &&
    items.every((item) => item.account && (parseAmount(item.debitAmount) > 0 || parseAmount(item.creditAmount) > 0)) &&
    (!showRateInputs || !ratesEditable || involvedCurrencies.every((c) => parseAmount(rates[c] ?? '') > 0)) &&
    (!showExactGrid ||
      items.every((item) => equivalentCurrenciesOf(item).every((c) => parseAmount(item.equivalents[c] ?? '') >= 0 && (item.equivalents[c] ?? '') !== '')))

  const handleSave = () => {
    clearError()
    const requestItems = buildRequestItems()
    const valuation = buildValuation()

    if (mode === 'create') {
      createTransaction.mutate(
        {
          transactionTypeId: selectedType!.id,
          transactionNumber: number,
          date,
          description,
          items: requestItems,
          valuation,
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
        { transactionNumber: number, description, items: requestItems, valuation },
        {
          onSuccess: () => onSuccess(),
          onError: (err) => handleError(err),
        },
      )
    } else if (mode === 'editInitialBalance') {
      editInitialBalance.mutate(
        {
          id: transactionId!,
          body: { transactionNumber: number, description, items: requestItems, valuation },
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
            valuation,
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
          <Typography variant="body2" sx={{ width: 64, textAlign: 'center', color: 'text.secondary' }}>
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

            <Chip
              label={item.account ? nativeOf(item) : '—'}
              size="small"
              variant="outlined"
              sx={{ width: 64 }}
              aria-label={t('valuation.nativeCurrency')}
              data-testid="native-currency"
            />

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

      {/* Totals per native currency + balance indicator */}
      {totalsByCurrency.map(([currency, total]) => (
        <Box key={currency} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }} data-testid="currency-totals">
          <Box sx={{ flex: '1 1 240px', textAlign: 'right', color: 'text.secondary' }}>
            <Typography variant="body2">{currency}</Typography>
          </Box>
          <Box sx={{ width: 64 }} />
          <Box sx={{ width: 110, borderTop: 1, borderColor: 'divider', pt: 0.5 }}>
            <Typography sx={{ fontSize: '1rem', textAlign: 'right', pr: '14px' }}>
              {formatMoney(total.debit, currency)}
            </Typography>
          </Box>
          <Box sx={{ width: 110, borderTop: 1, borderColor: 'divider', pt: 0.5 }}>
            <Typography sx={{ fontSize: '1rem', textAlign: 'right', pr: '14px' }}>
              {formatMoney(total.credit, currency)}
            </Typography>
          </Box>
        </Box>
      ))}
      {anyAmount && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={
              needsValuation && !preview
                ? t('valuation.notChecked')
                : isBalanced
                  ? t('transactionForm.balanced')
                  : t('transactionForm.unbalanced')
            }
            color={needsValuation && !preview ? 'default' : isBalanced ? 'success' : 'error'}
            size="small"
            data-testid="balance-chip"
          />
        </Box>
      )}

      {/* Valuation (MC-15): how the equivalents in the other tracked currencies are obtained */}
      {needsValuation && (
        <Box sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }} data-testid="valuation-section">
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            {t('valuation.title')}
          </Typography>
          <TextField
            select
            size="small"
            label={t('valuation.mode')}
            value={valuationMode}
            onChange={(e) => setValuationMode(e.target.value as ValuationMode)}
            disabled={isEditMode && !!initialData?.valuation}
            sx={{ minWidth: 260, mb: 1 }}
            data-testid="valuation-mode"
          >
            <MenuItem value="RATE_TABLE">{t('valuation.modeTable')}</MenuItem>
            <MenuItem value="RATES">{t('valuation.modeRates')}</MenuItem>
            <MenuItem value="EXACT_AMOUNTS">{t('valuation.modeExact')}</MenuItem>
          </TextField>

          {isEditMode && initialData?.valuation && initialData.valuation.mode !== 'EXACT_AMOUNTS' && (
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              {t('valuation.storedRates')}:{' '}
              {initialData.valuation.rates.map((r) => formatRate(r.rate, baseCurrency, r.currency)).join(', ')}
            </Typography>
          )}

          {showRateInputs && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {involvedCurrencies.map((currency) => (
                <TextField
                  key={currency}
                  value={rates[currency] ?? ''}
                  onChange={(e) => {
                    setRates((prev) => ({ ...prev, [currency]: normaliseAmountInput(e.target.value) }))
                    setRatesInverted((prev) => ({ ...prev, [currency]: isRateInverted(currency) }))
                  }}
                  onKeyDown={handleAmountKeyDown}
                  label={`${t('currency.rate')} ${currency}`}
                  helperText={
                    isRateInverted(currency)
                      ? t('currency.rateHelp', { base: currency, currency: baseCurrency })
                      : t('currency.rateHelp', { base: baseCurrency, currency })
                  }
                  disabled={!ratesEditable}
                  size="small"
                  sx={{ width: 200 }}
                  inputProps={{ style: { textAlign: 'right' }, inputMode: 'decimal' }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t('currency.swapRateDirection')}>
                          <IconButton
                            size="small"
                            edge="end"
                            aria-label={t('currency.swapRateDirection')}
                            onClick={() =>
                              setRatesInverted((prev) => ({ ...prev, [currency]: !isRateInverted(currency) }))
                            }
                            data-testid="rate-direction-toggle"
                          >
                            <SwapHorizIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  data-testid="rate-input"
                />
              ))}
            </Box>
          )}

          {showExactGrid && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                {t('valuation.exactHelp')}
              </Typography>
              {items.map((item) =>
                item.account && equivalentCurrenciesOf(item).length > 0 ? (
                  <Box key={item.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ minWidth: 220 }}>
                      {item.account.code} — {item.account.name} ({formatMoney(amountOf(item), nativeOf(item))})
                    </Typography>
                    {equivalentCurrenciesOf(item).map((currency) => (
                      <TextField
                        key={currency}
                        value={item.equivalents[currency] ?? ''}
                        onChange={(e) =>
                          updateItem(item.id, {
                            equivalents: { ...item.equivalents, [currency]: normaliseAmountInput(e.target.value) },
                          })
                        }
                        onKeyDown={handleAmountKeyDown}
                        label={currency}
                        size="small"
                        sx={{ width: 140 }}
                        inputProps={{ style: { textAlign: 'right' }, inputMode: 'decimal' }}
                        data-testid="equivalent-input"
                      />
                    ))}
                  </Box>
                ) : null,
              )}
            </Box>
          )}

          {!isInitialBalanceMode && (
            <Button
              size="small"
              variant="outlined"
              onClick={handlePreview}
              disabled={!selectedType || !date || previewValuation.isPending}
              data-testid="preview-valuation"
            >
              {t('valuation.preview')}
            </Button>
          )}

          {preview && (
            <Table size="small" sx={{ mt: 1 }} data-testid="valuation-preview">
              <TableHead>
                <TableRow>
                  <TableCell>{t('transactionForm.account')}</TableCell>
                  <TableCell>{t('valuation.equivalents')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(preview.items ?? []).map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {items[index]?.account ? `${items[index].account!.code} — ${items[index].account!.name}` : line.accountId}
                    </TableCell>
                    <TableCell>
                      {(line.equivalents ?? [])
                        .map(
                          (e) =>
                            `${formatMoney(e.amount, e.currency ?? '')}${e.roundingAdjustment ? ` (${t('valuation.rounding')} ${e.roundingAdjustment})` : ''}`,
                        )
                        .join(' · ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {preview?.valuation?.rates && preview.valuation.rates.length > 0 && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {t('valuation.ratesUsed')}:{' '}
              {preview.valuation.rates
                .map((r) => `${formatRate(r.rate ?? 0, baseCurrency, r.currency ?? '')}${r.rateDate ? ` (${r.rateDate})` : ''}`)
                .join(', ')}
            </Typography>
          )}
        </Box>
      )}

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

import { useState, useCallback, Fragment, type ReactNode } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { useAccountTransactionsInPeriod } from '@/hooks/api/useAccountTransactionsInPeriod'
import { useTransactions, type Transaction } from '@/hooks/api/useTransactions'
import { useTransactionById } from '@/hooks/api/useTransactionById'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'
import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess'
import { useCurrencyView } from '@/hooks/useCurrencyView'
import { useCurrencyViewStore } from '@/store/currencyViewStore'
import { useExtraCurrencyStatements } from '@/hooks/api/useExtraCurrencyStatements'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { useRowFlash } from '@/hooks/useRowFlash'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { InitialDateConfigurationAlert } from '@/components/ui/InitialDateConfigurationAlert'
import type { TransactionFormInitialData, FormMode } from './TransactionForm'
import { TransactionFormDialog } from './TransactionFormDialog'
import { formatMoney, formatRate } from '@/utils/money'

const DEFAULT_ROWS_PER_PAGE = 50
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100, 200]

interface TransactionListProps {
  workspaceId: string
  /** Period chosen in the Accounting header (inclusive dates, yyyy-MM-dd). */
  from: string
  to: string
  /**
   * The chosen account. With an account the list is that account's statement (opening balance,
   * running balance); without one it is every transaction of the period, for all accounts.
   */
  accountId?: string
  accountCode?: string
  accountName?: string
  thirdPartyId?: string
  thirdPartyName?: string
  /** The user picked an account (in the picker or in a transaction item). */
  onAccountSelect: (accountId: string) => void
  /** The user removed the chosen account. */
  onClearAccount: () => void
}

interface FormConfig {
  mode: FormMode
  transactionId?: string
  initialData?: TransactionFormInitialData
}

/** One item line of a transaction, ready to show. */
interface ListItem {
  accountId?: string
  accountLabel: string
  thirdPartyName?: string | null
  debit: ReactNode
  credit: ReactNode
  /** The line's amount in each extra currency, with its rate, keyed by currency (full list only). */
  amountsIn?: Record<string, ReactNode>
}

/** One transaction, ready to show. Both data sources (statement and full list) are mapped to this. */
interface ListRow {
  id: string
  date: string
  typeName: string
  number: string
  description: string
  debit: string
  credit: string
  /** Debit total in each extra currency, keyed by currency (full list only). */
  amountsIn?: Record<string, string>
  /** Balance of the chosen account after this transaction (statement only). */
  balance?: string
  items: ListItem[]
  /** The full transaction when the data source already has it; otherwise it is fetched to edit. */
  source?: Transaction
}

type TransactionItem = NonNullable<Transaction['items']>[number]

/** What an item needs to show its amount; both data sources provide it. */
interface ItemAmounts {
  debitAmount?: number | null
  creditAmount?: number | null
  /** Native currency of the item. */
  currency?: string | null
  /** Value of the item in each other tracked currency. */
  equivalents?: { currency: string; amount: number }[] | null
}

function buildInitialData(txn: Transaction): TransactionFormInitialData {
  return {
    transactionTypeId: txn.transactionTypeId ?? '',
    transactionTypeName: txn.transactionTypeName ?? '',
    transactionNumber: txn.transactionNumber ?? '',
    date: txn.date ?? '',
    description: txn.description ?? '',
    valuation: txn.valuation
      ? {
          mode: txn.valuation.mode === 'CLIENT_RATES' ? 'RATES' : txn.valuation.mode,
          rates: txn.valuation.rates.map((r) => ({ currency: r.currency, rate: r.rate })),
        }
      : null,
    items: (txn.items ?? []).map((item) => ({
      accountId: item.accountId ?? '',
      accountCode: item.accountCode ?? '',
      accountName: item.accountName ?? '',
      hasThirdParties: !!item.thirdPartyId,
      thirdPartyId: item.thirdPartyId ?? null,
      thirdPartyName: item.thirdPartyName ?? null,
      debitAmount: item.debitAmount ?? 0,
      creditAmount: item.creditAmount ?? 0,
      equivalents: (item.equivalents ?? []).map((e) => ({ currency: e.currency, amount: e.amount })),
    })),
  }
}

/**
 * The transactions of the period, in the Transactions tab of Accounting.
 *
 * - Without an account: every transaction, paged by the backend, amounts in base currency.
 * - With an account: that account's statement, in the currency of the currency selector, with the
 *   balance after each transaction. The backend returns the whole statement, so the type filter and
 *   the pages are applied here.
 *
 * Both modes look the same: newest transaction first, and every item amount in the currency of the
 * list, with the original amount and the rate below it when the item is in another currency.
 */
export function TransactionList({
  workspaceId,
  from,
  to,
  accountId,
  accountCode = '',
  accountName = '',
  thirdPartyId,
  thirdPartyName,
  onAccountSelect,
  onClearAccount,
}: TransactionListProps) {
  const { t } = useTranslation()
  const hasAccount = Boolean(accountId)

  const { data: workspaceConfig } = useWorkspaceConfig(workspaceId || null)
  const { hasWorkspaceAccess } = useWorkspaceAccess()
  // Unknown while the configuration loads: only a loaded configuration without a date counts as missing
  const initialDateMissing = workspaceConfig !== undefined && !workspaceConfig?.systemInitialDate

  // ── Filters and pages ──
  const [typeFilter, setTypeFilter] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE)

  // Currencies. The statement and the full list both follow the currency selector.
  const { view, baseCurrency: viewBaseCurrency, displayCurrency } = useCurrencyView(workspaceId)
  const baseCurrency = workspaceConfig?.baseCurrency ?? viewBaseCurrency ?? null
  const journalCurrency = displayCurrency ?? baseCurrency

  // A new period, currency or account starts again on the first page (adjusting state while rendering)
  const scopeKey = `${from}|${to}|${accountId ?? ''}|${thirdPartyId ?? ''}|${displayCurrency ?? ''}`
  const [pagedScope, setPagedScope] = useState(scopeKey)
  if (pagedScope !== scopeKey) {
    setPagedScope(scopeKey)
    setPage(0)
  }

  const { data: transactionTypes } = useTransactionTypes()
  const typeOptions = (transactionTypes ?? []).map((tt) => ({ id: tt.id!, name: tt.name! }))
  const { data: accounts } = useAccounts(workspaceId || null)
  const accountOptions = (accounts ?? []).map((a) => ({ id: a.id!, label: `${a.code} — ${a.name}` }))

  // ── Data: only the source of the current mode is requested ──
  const statement = useAccountTransactionsInPeriod(
    hasAccount ? workspaceId : null,
    accountId,
    from,
    to,
    thirdPartyId,
  )
  // The full list shows only transactions with a line in the chosen currency (MC-23): the API filters them
  const journal = useTransactions(
    hasAccount ? null : workspaceId || null,
    { dateFrom: from, dateTo: to, transactionTypeId: typeFilter?.id, currency: displayCurrency ?? undefined },
    { page, size: rowsPerPage },
  )
  const isLoading = hasAccount ? statement.isLoading : journal.isLoading
  const isError = hasAccount ? statement.isError : journal.isError
  const error = (hasAccount ? statement.error : journal.error) ?? null
  const refetch = hasAccount ? statement.refetch : journal.refetch

  const chosenExtra = useCurrencyViewStore((s) => s.extraCurrencies)
  const extraCurrencies = hasAccount ? chosenExtra.filter((c) => c !== (view.currency ?? viewBaseCurrency)) : []
  // The full list has no account statement, so each extra currency is one amount column: the transaction's debit total
  const journalCurrencies = hasAccount ? [] : chosenExtra.filter((c) => c !== (view.currency ?? viewBaseCurrency))
  const extraColumns = useExtraCurrencyStatements(
    workspaceId,
    hasAccount ? accountId : null,
    from,
    to,
    extraCurrencies,
    thirdPartyId,
  )
  // The query service answers 400 when the account (and its descendants) does not track the chosen currency
  const untrackedCurrency =
    hasAccount && isError && error?.errorCode === 'VALIDATION_ERROR' && view.currency ? view.currency : null

  const listCurrency = hasAccount ? (statement.data?.currency ?? null) : journalCurrency
  const withCurrency = (label: string): string => (listCurrency ? `${label} (${listCurrency})` : label)

  // ── Item amounts, the same for both modes ──
  // The debit and credit columns are in the currency of the list. An item in another currency shows its
  // equivalent in that currency, and below it the original amount with the rate in its readable direction
  // (see formatRate). Without a stored equivalent the amount shows a dash. Among the items of a transaction
  // that repeat a note or share a rate, only the last one shows the note (see renderItemAmount).
  const equivalentOf = (item: ItemAmounts): number | undefined =>
    item.equivalents?.find((e) => e.currency === listCurrency)?.amount
  const isForeign = (item: ItemAmounts): boolean => !!item.currency && item.currency !== listCurrency
  const originalNoteKey = (item: ItemAmounts): string | null => {
    const equivalent = equivalentOf(item)
    if (!isForeign(item) || equivalent == null) return null
    return `${item.currency}|${item.debitAmount || item.creditAmount}|${equivalent}`
  }
  /**
   * The rate text of an item, or null when the item has no rate to show: it is in the list currency, or has
   * no equivalent.
   * @param storedRates the exact rates saved with the transaction. Only when it has none for the pair of
   *   currencies (two non-base currencies, or exact amounts typed by hand) is the rate the one the two
   *   amounts imply.
   */
  function rateTextOf(
    items: ItemAmounts[],
    itemIndex: number,
    storedRates?: { currency: string; rate: number }[],
  ): string | null {
    const item = items[itemIndex]
    const amount = item.debitAmount || item.creditAmount
    if (!amount || !isForeign(item)) return null
    const currency = item.currency as string
    const equivalent = equivalentOf(item)
    if (equivalent == null) return null
    return pairRateText(currency, listCurrency as string, amount, equivalent, storedRates)
  }

  /**
   * The rate between two currencies, as readable text. A stored rate is used when one of the two is the base
   * currency (it relates the base and one other currency); otherwise the rate is the one the two amounts imply.
   * @param fromAmount the amount in `fromCurrency`; `toAmount` is the same value in `toCurrency`.
   */
  function pairRateText(
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number,
    toAmount: number,
    storedRates?: { currency: string; rate: number }[],
  ): string {
    const otherCurrency =
      fromCurrency === baseCurrency ? toCurrency : toCurrency === baseCurrency ? fromCurrency : null
    const storedRate = otherCurrency ? storedRates?.find((r) => r.currency === otherCurrency)?.rate : undefined
    return storedRate != null && otherCurrency
      ? formatRate(storedRate, baseCurrency, otherCurrency)
      : formatRate(toAmount / fromAmount, toCurrency, fromCurrency)
  }

  /**
   * Among the items of a transaction, only the last one with a given note or rate shows it:
   * - an earlier item with the same amounts as a later one shows its equivalent alone;
   * - an earlier item with the same rate as a later one shows its original amount alone;
   * - the last one shows the original amount and the rate, on one line.
   */
  function renderItemAmount(
    items: ItemAmounts[],
    itemIndex: number,
    amount: number | null | undefined,
    storedRates?: { currency: string; rate: number }[],
  ): ReactNode {
    const item = items[itemIndex]
    if (!amount) return ''
    if (!isForeign(item)) return formatMoney(amount, listCurrency)
    const currency = item.currency as string
    const original = formatMoney(amount, currency, { withCode: true })
    const equivalent = equivalentOf(item)
    const rateText = rateTextOf(items, itemIndex, storedRates)
    if (equivalent == null || rateText == null) return '—'
    // In its own column (full list), the amount and its rate show there, not here
    if (journalCurrencies.includes(currency)) return formatMoney(equivalent, listCurrency)
    const key = originalNoteKey(item)
    const noteRepeatedLater = items.some(
      (later, laterIndex) => laterIndex > itemIndex && originalNoteKey(later) === key,
    )
    if (noteRepeatedLater) return formatMoney(equivalent, listCurrency)
    const rateRepeatedLater = items.some(
      (_, laterIndex) => laterIndex > itemIndex && rateTextOf(items, laterIndex, storedRates) === rateText,
    )
    return (
      <>
        {formatMoney(equivalent, listCurrency)}
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ whiteSpace: 'nowrap' }}
          data-testid="item-original-amount"
        >
          {rateRepeatedLater ? original : `${original} · ${rateText}`}
        </Typography>
      </>
    )
  }

  // ── Rows of the full list ──
  // The totals are in the currency of the list: an item counts with its own amount when it is in that currency
  // and with its stored equivalent otherwise. An item without a stored equivalent is left out of the totals.
  const amountInList = (item: TransactionItem, amount: number): number | undefined =>
    amountInCurrency(item, amount, journalCurrency)
  /** An amount of an item in a currency: its own amount in its native currency, else its stored equivalent. */
  function amountInCurrency(item: TransactionItem, amount: number, currency: string | null): number | undefined {
    return !item.currency || item.currency === currency
      ? amount
      : item.equivalents?.find((e) => e.currency === currency)?.amount
  }
  /**
   * The amount of one line in an extra currency, with the rate that relates it below. In its own currency it is
   * the native amount, with its rate to the base; otherwise it is the stored equivalent, with the rate between the
   * two currencies. A dash when the line has no amount in that currency.
   */
  function lineAmountIn(
    item: TransactionItem,
    currency: string,
    storedRates?: { currency: string; rate: number }[],
  ): { amount: string; rate: string | null } {
    const amount = item.debitAmount || item.creditAmount
    const value = amount ? amountInCurrency(item, amount, currency) : undefined
    if (!amount || value === undefined) return { amount: '—', rate: null }
    const native = item.currency ?? baseCurrency
    let rate: string | null = null
    if (native === currency && currency !== baseCurrency && baseCurrency) {
      const baseAmount = item.equivalents?.find((e) => e.currency === baseCurrency)?.amount
      if (baseAmount != null) rate = pairRateText(currency, baseCurrency, amount, baseAmount, storedRates)
    } else if (native && native !== currency) {
      rate = pairRateText(native, currency, amount, value, storedRates)
    }
    return { amount: formatMoney(value, currency), rate }
  }
  /** The total of one side of the items in a currency, or undefined when no line of that side has an amount in it. */
  function sideTotalIn(
    items: TransactionItem[],
    side: 'debitAmount' | 'creditAmount',
    currency: string,
  ): number | undefined {
    let total: number | undefined
    for (const item of items) {
      const amount = item[side]
      if (!amount) continue
      const value = amountInCurrency(item, amount, currency)
      if (value !== undefined) total = (total ?? 0) + value
    }
    return total
  }
  function journalRow(txn: Transaction): ListRow {
    const items = txn.items ?? []
    const sumOf = (pick: (item: TransactionItem) => number | undefined): number =>
      items.reduce((sum, item) => sum + (pick(item) ?? 0), 0)
    const debit = sumOf((item) => (item.debitAmount ? amountInList(item, item.debitAmount) : undefined))
    const credit = sumOf((item) => (item.creditAmount ? amountInList(item, item.creditAmount) : undefined))
    // Extra currency columns: the debit total in that currency, or the credit total when no debit line has an
    // amount in it. Only native amounts and stored equivalents count; a line without one is left out.
    const amountsIn: Record<string, string> = {}
    for (const currency of journalCurrencies) {
      const total = sideTotalIn(items, 'debitAmount', currency) ?? sideTotalIn(items, 'creditAmount', currency)
      amountsIn[currency] = total === undefined ? '—' : formatMoney(total, currency)
    }
    // Per line and extra currency: the amount and its rate. A rate is shown only under the last line that shares it.
    const lineAmounts = items.map((item) =>
      journalCurrencies.map((currency) => lineAmountIn(item, currency, txn.valuation?.rates)),
    )
    const lineAmountNode = (itemIndex: number, columnIndex: number): ReactNode => {
      const { amount, rate } = lineAmounts[itemIndex][columnIndex]
      const repeatedLater =
        rate !== null &&
        lineAmounts.some((later, laterIndex) => laterIndex > itemIndex && later[columnIndex].rate === rate)
      return (
        <>
          {amount}
          {rate !== null && !repeatedLater && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ whiteSpace: 'nowrap' }}
              data-testid="item-original-amount"
            >
              {rate}
            </Typography>
          )}
        </>
      )
    }
    return {
      id: txn.id ?? '',
      date: txn.date ?? '',
      typeName: txn.transactionTypeName ?? '',
      number: txn.transactionNumber ?? '',
      description: txn.description ?? '',
      debit: debit > 0 ? formatMoney(debit, journalCurrency) : '',
      credit: credit > 0 ? formatMoney(credit, journalCurrency) : '',
      amountsIn,
      items: items.map((item, itemIndex) => ({
        accountId: item.accountId ?? undefined,
        accountLabel: `${item.accountCode} ${item.accountName}`,
        thirdPartyName: item.thirdPartyName,
        debit: renderItemAmount(items, itemIndex, item.debitAmount, txn.valuation?.rates),
        credit: renderItemAmount(items, itemIndex, item.creditAmount, txn.valuation?.rates),
        amountsIn: Object.fromEntries(
          journalCurrencies.map((currency, columnIndex) => [currency, lineAmountNode(itemIndex, columnIndex)]),
        ),
      })),
      source: txn,
    }
  }

  // ── Rows of one account's statement (currency of the statement) ──
  // The backend returns the whole statement, oldest first: here it is put newest first (the order of the full
  // list), and the type filter and the pages are applied. The balance of a row is always the real balance of
  // the account after that transaction, also when rows are filtered out.
  const statementCurrency = statement.data?.currency
  const statementTransactions = [...(statement.data?.transactions ?? [])]
    .reverse()
    .filter((txn) => !typeFilter || txn.transactionTypeName === typeFilter.name)

  let rows: ListRow[]
  let totalCount: number
  if (hasAccount) {
    totalCount = statementTransactions.length
    rows = statementTransactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((txn) => ({
      id: txn.transactionId,
      date: txn.date,
      typeName: txn.transactionTypeName,
      number: txn.transactionNumber,
      description: txn.description ?? '',
      debit: txn.debitAmount !== 0 ? formatMoney(txn.debitAmount, statementCurrency) : '',
      credit: txn.creditAmount !== 0 ? formatMoney(txn.creditAmount, statementCurrency) : '',
      balance: formatMoney(txn.runningBalance, statementCurrency),
      items: txn.items.map((item, itemIndex) => ({
        // The chosen account itself is not a link
        accountId: item.accountId !== accountId ? item.accountId : undefined,
        accountLabel: `${item.accountCode} ${item.accountName}`,
        thirdPartyName: item.thirdPartyName,
        debit: renderItemAmount(txn.items, itemIndex, item.debitAmount, txn.valuation?.rates),
        credit: renderItemAmount(txn.items, itemIndex, item.creditAmount, txn.valuation?.rates),
      })),
    }))
  } else {
    totalCount = journal.data?.totalElements ?? 0
    rows = (journal.data?.content ?? []).map(journalRow)
  }

  // Step back to the last page when the current one is empty, e.g. after a delete (adjusting state while rendering)
  const lastPage = Math.max(0, Math.ceil(totalCount / rowsPerPage) - 1)
  const dataLoaded = hasAccount ? Boolean(statement.data) : Boolean(journal.data)
  if (dataLoaded && rows.length === 0 && page > 0 && page > lastPage) {
    setPage(lastPage)
  }

  // ── Create, edit, delete ──
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null)
  const [deletingTxnId, setDeletingTxnId] = useState<string | null>(null)

  // The statement does not carry the full transaction: fetch it, then open the form
  const { data: editTxnData, isSuccess: editFetched } = useTransactionById(workspaceId, editingTxnId)
  if (editFetched && editTxnData && editingTxnId) {
    setFormConfig({ mode: 'edit', transactionId: editingTxnId, initialData: buildInitialData(editTxnData) })
    setEditingTxnId(null)
  }

  const handleEdit = (row: ListRow) => {
    if (row.source) {
      setFormConfig({ mode: 'edit', transactionId: row.id, initialData: buildInitialData(row.source) })
    } else {
      setEditingTxnId(row.id)
    }
  }

  const handleNew = useCallback(() => {
    if (!initialDateMissing) setFormConfig((current) => current ?? { mode: 'create' })
  }, [initialDateMissing])
  useKeyboardShortcut('n', t('accounting.shortcuts.newTransaction'), handleNew)

  const { deleteTransaction } = useTransactionMutations(workspaceId)
  const handleDeleteConfirm = () => {
    if (!deletingTxnId) return
    deleteTransaction.mutate(deletingTxnId, {
      onSuccess: () => setDeletingTxnId(null),
      onError: () => setDeletingTxnId(null),
    })
  }

  // The saved row is highlighted for a moment, so the user sees where the change landed
  const [flashedTxnId, flashTxn] = useRowFlash()
  const handleFormSuccess = () => {
    if (formConfig?.transactionId) flashTxn(formConfig.transactionId)
    setFormConfig(null)
  }

  const accountTitle = thirdPartyName
    ? `${accountCode} ${accountName} / ${thirdPartyName}`
    : `${accountCode} ${accountName}`
  const columnCount = 7 + (hasAccount ? 1 + extraColumns.length : journalCurrencies.length)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {hasAccount ? (
          // The chosen account is a removable chip: removing it shows all accounts
          <Chip
            label={accountTitle}
            onDelete={onClearAccount}
            color="primary"
            variant="outlined"
            sx={{ fontSize: '1rem', fontWeight: 600, height: 36 }}
            data-testid="account-chip"
          />
        ) : (
          // Picking an account opens its statement (opening balance, running balance)
          <Autocomplete
            options={accountOptions}
            value={null}
            onChange={(_, v) => {
              if (v) onAccountSelect(v.id)
            }}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label={t('transactionsPage.account')} size="small" />}
            sx={{ minWidth: 260 }}
            size="small"
            blurOnSelect
            data-testid="journal-account-picker"
          />
        )}
        <Autocomplete
          options={typeOptions}
          value={typeFilter}
          onChange={(_, v) => {
            setTypeFilter(v)
            setPage(0)
          }}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => (
            <TextField {...params} label={t('transactionsPage.transactionType')} size="small" />
          )}
          sx={{ minWidth: 200 }}
          size="small"
          data-testid="journal-type-filter"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={initialDateMissing ? t('common.insufficientPermissions') : ''}>
          <span>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNew}
              disabled={initialDateMissing}
              aria-label={t('transactionForm.newTransaction')}
              data-testid="new-transaction-btn"
            >
              {t('transactionForm.newTransaction')}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {initialDateMissing && hasWorkspaceAccess(workspaceId) && (
        <InitialDateConfigurationAlert
          workspaceId={workspaceId}
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
          testId="initial-date-warning"
        />
      )}

      {/* Create/edit form, in a dialog over the list */}
      {formConfig && (
        <TransactionFormDialog
          workspaceId={workspaceId}
          mode={formConfig.mode}
          transactionId={formConfig.transactionId}
          initialData={formConfig.initialData}
          onSuccess={handleFormSuccess}
          onClose={() => setFormConfig(null)}
        />
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">{t('accounting.transactions.loading')}</Typography>
        </Box>
      )}

      {isError && untrackedCurrency && (
        <Alert severity="info" data-testid="untracked-currency-message">
          {t('accounting.transactions.untrackedCurrency', {
            account: `${accountCode} ${accountName}`,
            currency: untrackedCurrency,
            base: viewBaseCurrency ?? '',
          })}
        </Alert>
      )}

      {isError && !untrackedCurrency && <ErrorMessage error={error} onRetry={() => void refetch()} />}

      {!isLoading && !isError && (
        <>
          {/* Totals of the chosen account for the period */}
          {hasAccount && statement.data && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} data-testid="statement-summary">
              {([
                ['openingBalance', statement.data.openingBalance],
                ['totalDebits', statement.data.totalDebits],
                ['totalCredits', statement.data.totalCredits],
                ['closingBalance', statement.data.closingBalance],
              ] as const).map(([key, value], index) => (
                <Fragment key={key}>
                  {index > 0 && ' · '}
                  {t(`accounting.transactions.${key}`)}:{' '}
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {formatMoney(value, statementCurrency, { withCode: key === 'closingBalance' })}
                  </Box>
                </Fragment>
              ))}
              {extraColumns.map((column) => (
                <Fragment key={column.currency}>
                  {' · '}
                  {t('accounting.transactions.closingBalanceIn', { currency: column.currency })}:{' '}
                  <Box component="span" sx={{ fontWeight: 600 }} data-testid={`extra-closing-${column.currency}`}>
                    {column.closingBalance === null ? '—' : formatMoney(column.closingBalance, column.currency)}
                  </Box>
                </Fragment>
              ))}
            </Typography>
          )}

          <TableContainer>
            <Table size="small" aria-label="transactions" data-testid="transactions-table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('accounting.transactions.date')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('accounting.transactions.type')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('accounting.transactions.number')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('accounting.transactions.description')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {withCurrency(t('accounting.transactions.debit'))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {withCurrency(t('accounting.transactions.credit'))}
                  </TableCell>
                  {journalCurrencies.map((currency) => (
                    <TableCell key={currency} align="right" sx={{ fontWeight: 700 }}>
                      {t('accounting.transactions.amountIn', { currency })}
                    </TableCell>
                  ))}
                  {/* A running balance only means something for one account */}
                  {hasAccount && (
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t('accounting.transactions.runningBalance')}
                    </TableCell>
                  )}
                  {extraColumns.map((column) => (
                    <TableCell key={column.currency} align="right" sx={{ fontWeight: 700 }}>
                      {t('accounting.transactions.balanceIn', { currency: column.currency })}
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 700, width: 80 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columnCount} sx={{ color: 'text.secondary' }}>
                      {t('accounting.transactions.noTransactions')}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <Fragment key={row.id}>
                    {/* Transaction summary row */}
                    <TableRow
                      hover
                      data-testid={`txn-row-${row.id}`}
                      sx={{
                        transition: 'background-color 0.4s',
                        bgcolor: flashedTxnId === row.id ? 'primary.light' : undefined,
                      }}
                    >
                      <TableCell sx={{ py: 0.75, whiteSpace: 'nowrap' }}>{row.date}</TableCell>
                      <TableCell sx={{ py: 0.75 }}>{row.typeName}</TableCell>
                      <TableCell sx={{ py: 0.75, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {row.number}
                      </TableCell>
                      <TableCell sx={{ py: 0.75 }}>{row.description}</TableCell>
                      <TableCell align="right" sx={{ py: 0.75 }}>
                        {row.debit}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.75 }}>
                        {row.credit}
                      </TableCell>
                      {journalCurrencies.map((currency) => (
                        <TableCell
                          key={currency}
                          align="right"
                          data-testid={`journal-amount-${currency}`}
                          sx={{ py: 0.75 }}
                        >
                          {row.amountsIn?.[currency] ?? ''}
                        </TableCell>
                      ))}
                      {hasAccount && (
                        <TableCell align="right" sx={{ py: 0.75, fontWeight: 600 }}>
                          {row.balance}
                        </TableCell>
                      )}
                      {extraColumns.map((column) => {
                        const balance = column.runningBalanceByTransaction.get(row.id)
                        return (
                          <TableCell
                            key={column.currency}
                            align="right"
                            data-testid={`extra-balance-${column.currency}`}
                            sx={{ py: 0.75, fontWeight: 600 }}
                          >
                            {balance === undefined ? '—' : formatMoney(balance, column.currency)}
                          </TableCell>
                        )
                      })}
                      <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(row)}
                          aria-label={`${t('common.edit')} ${row.number}`}
                          data-testid={`edit-txn-${row.id}`}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeletingTxnId(row.id)}
                          aria-label={`${t('common.delete')} ${row.number}`}
                          data-testid={`delete-txn-${row.id}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>

                    {/* Item rows */}
                    {row.items.map((item, itemIndex) => (
                      <TableRow key={`${row.id}-item-${itemIndex}`} sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ py: 0.5, pl: 4, verticalAlign: 'top' }} colSpan={4}>
                          {item.accountId ? (
                            <Link
                              component="button"
                              type="button"
                              underline="hover"
                              color="inherit"
                              onClick={() => onAccountSelect(item.accountId!)}
                              data-testid={`item-account-${row.id}-${itemIndex}`}
                            >
                              {item.accountLabel}
                            </Link>
                          ) : (
                            item.accountLabel
                          )}
                          {item.thirdPartyName && ` / ${item.thirdPartyName}`}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontSize: '0.875em', verticalAlign: 'top' }}>
                          {item.debit}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontSize: '0.875em', verticalAlign: 'top' }}>
                          {item.credit}
                        </TableCell>
                        {journalCurrencies.map((currency) => (
                          <TableCell
                            key={currency}
                            align="right"
                            data-testid={`journal-item-amount-${currency}`}
                            sx={{ py: 0.5, fontSize: '0.875em', verticalAlign: 'top' }}
                          >
                            {item.amountsIn?.[currency] ?? ''}
                          </TableCell>
                        ))}
                        <TableCell sx={{ py: 0.5 }} colSpan={columnCount - 6 - journalCurrencies.length} />
                      </TableRow>
                    ))}

                    {/* Visual separator row */}
                    <TableRow sx={{ height: 4 }}>
                      <TableCell colSpan={columnCount} sx={{ p: 0, borderBottom: '1px solid', borderColor: 'divider' }} />
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={Math.min(page, lastPage)}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            labelRowsPerPage={t('transactionsPage.rowsPerPage')}
          />
        </>
      )}

      {/* Shown while the transaction to edit is fetched */}
      {editingTxnId && !formConfig && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {t('common.loading')}
          </Typography>
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deletingTxnId)} onClose={() => setDeletingTxnId(null)}>
        <DialogTitle>{t('transactionForm.confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('transactionForm.confirmDelete')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingTxnId(null)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteTransaction.isPending}
            data-testid="confirm-delete-btn"
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

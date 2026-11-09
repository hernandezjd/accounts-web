import { useEffect, useState, Fragment } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import TablePagination from '@mui/material/TablePagination'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import { useTranslation } from 'react-i18next'
import { useTransactions, type Transaction, type TransactionFilters } from '@/hooks/api/useTransactions'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { PREFERENCE_KEYS } from '@/utils/preferences'
import { resolveDefaultListPeriod } from '@/utils/period'
import type { Granularity } from '@/types/accounting'
import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { InitialDateConfigurationAlert } from '@/components/ui/InitialDateConfigurationAlert'
import { TransactionForm, type TransactionFormInitialData } from '../accounting/TransactionForm'
import { formatMoney } from '@/utils/money'

const DEFAULT_ROWS_PER_PAGE = 50
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100, 200]

interface FilterForm {
  dateFrom: string
  dateTo: string
  transactionTypeId?: string
  accountId?: string
}

// ─── TransactionsPage ──────────────────────────────────────────────────────────

export function TransactionsPage() {
  const { t } = useTranslation()
  const { workspaceId = '' } = useParams<{ workspaceId: string }>()

  // The list opens on the period Accounting is showing (stored preference, else the current period)
  const [storedGranularity] = useLocalStorage<Granularity>(PREFERENCE_KEYS.ACCOUNTING_GRANULARITY, 'monthly')
  const [storedPeriodFrom] = useLocalStorage<string | null>(PREFERENCE_KEYS.ACCOUNTING_PERIOD_FROM, null)
  const [storedPeriodTo] = useLocalStorage<string | null>(PREFERENCE_KEYS.ACCOUNTING_PERIOD_TO, null)

  const { data: workspaceConfig } = useWorkspaceConfig(workspaceId || null)
  const baseCurrency = workspaceConfig?.baseCurrency ?? null
  const defaultPeriod = resolveDefaultListPeriod(
    storedPeriodFrom,
    storedPeriodTo,
    storedGranularity,
    workspaceConfig?.systemInitialDate,
  )

  // Filter form: null until the user edits it, so the default period applies
  const [draftFilters, setDraftFilters] = useState<FilterForm | null>(null)
  const [appliedOverride, setAppliedOverride] = useState<TransactionFilters | null>(null)
  const filterForm: FilterForm = draftFilters ?? { dateFrom: defaultPeriod.from, dateTo: defaultPeriod.to }
  const appliedFilters: TransactionFilters = appliedOverride ?? {
    dateFrom: defaultPeriod.from,
    dateTo: defaultPeriod.to,
  }

  // Pagination state
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE)

  // Inline form state
  const [activeFormMode, setActiveFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const { data: transactionsPage, isLoading, isError, error } = useTransactions(
    workspaceId || null,
    appliedFilters,
    { page, size: rowsPerPage },
  )
  const transactions = transactionsPage?.content ?? []
  const totalCount = transactionsPage?.totalElements ?? 0
  const { data: transactionTypes } = useTransactionTypes()
  const { data: accounts } = useAccounts(workspaceId || null)
  const { hasWorkspaceAccess } = useWorkspaceAccess()

  // If the last row of the last page disappears (e.g. after a delete), step back to the new last page
  useEffect(() => {
    if (transactionsPage && transactionsPage.content.length === 0 && page > 0) {
      setPage(Math.max(0, transactionsPage.totalPages - 1))
    }
  }, [transactionsPage, page])

  const initialDateMissing = !workspaceConfig?.systemInitialDate
  const hasAccess = hasWorkspaceAccess(workspaceId)

  const typeOptions = (transactionTypes ?? []).map((tt) => ({ id: tt.id!, name: tt.name! }))
  const accountOptions = (accounts ?? []).map((a) => ({ id: a.id!, label: `${a.code} — ${a.name}` }))

  // A transaction balances in base currency (MC-11): an item counts with its own amount when it is in the base
  // currency and with its base equivalent otherwise
  const baseAmountOf = (item: NonNullable<Transaction['items']>[number], amount: number): number =>
    !item.currency || item.currency === baseCurrency
      ? amount
      : (item.equivalents?.find((e) => e.currency === baseCurrency)?.amount ?? 0)
  function getTransactionTotals(txn: Transaction): { debit: number; credit: number } {
    const items = txn.items ?? []
    return {
      debit: items.reduce((sum, item) => sum + (item.debitAmount ? baseAmountOf(item, item.debitAmount) : 0), 0),
      credit: items.reduce((sum, item) => sum + (item.creditAmount ? baseAmountOf(item, item.creditAmount) : 0), 0),
    }
  }

  // Item amounts are in the currency of the item; the currency code is shown when it is not the base currency
  function formatItemAmount(amount: number, currency?: string | null): string {
    const text = formatMoney(amount, currency ?? baseCurrency)
    return currency && currency !== baseCurrency ? `${text} ${currency}` : text
  }

  const updateFilterForm = (patch: Partial<FilterForm>) => {
    setDraftFilters({ ...filterForm, ...patch })
  }

  const handleApplyFilters = () => {
    setAppliedOverride({
      dateFrom: filterForm.dateFrom || undefined,
      dateTo: filterForm.dateTo || undefined,
      transactionTypeId: filterForm.transactionTypeId,
      accountId: filterForm.accountId,
    })
    setPage(0)
  }

  const handleClearFilters = () => {
    setDraftFilters({ dateFrom: '', dateTo: '' })
    setAppliedOverride({})
    setPage(0)
  }

  const buildInitialData = (txn: Transaction): TransactionFormInitialData => ({
    transactionTypeId: txn.transactionTypeId ?? '',
    transactionTypeName: txn.transactionTypeName ?? '',
    transactionNumber: txn.transactionNumber ?? '',
    date: txn.date ?? '',
    description: txn.description ?? '',
    valuation: txn.valuation ? { mode: txn.valuation.mode === 'CLIENT_RATES' ? 'RATES' : txn.valuation.mode, rates: txn.valuation.rates.map((r) => ({ currency: r.currency, rate: r.rate })) } : null,
    items: (txn.items ?? []).map((item) => ({
      accountId: item.accountId ?? '',
      accountCode: item.accountCode ?? '',
      accountName: item.accountName ?? '',
      hasThirdParties: false,
      thirdPartyId: item.thirdPartyId ?? null,
      thirdPartyName: item.thirdPartyName ?? null,
      debitAmount: item.debitAmount ?? 0,
      creditAmount: item.creditAmount ?? 0,
      equivalents: (item.equivalents ?? []).map((e) => ({ currency: e.currency, amount: e.amount })),
    })),
  })

  const handleNewTransaction = () => {
    setEditingTransaction(null)
    setActiveFormMode('create')
  }

  const handleEditTransaction = (txn: Transaction) => {
    setEditingTransaction(txn)
    setActiveFormMode('edit')
  }

  const handleFormClose = () => {
    setActiveFormMode(null)
    setEditingTransaction(null)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('transactionsPage.title')}
        </Typography>
        {activeFormMode === null && (
          <Tooltip title={initialDateMissing ? t('common.insufficientPermissions') : ''}>
            <span>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNewTransaction}
                disabled={initialDateMissing}
                data-testid="new-transaction-btn"
              >
                {t('transactionsPage.newTransaction')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {initialDateMissing && hasAccess && (
        <InitialDateConfigurationAlert
          workspaceId={workspaceId}
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
          testId="initial-date-warning"
        />
      )}

      {/* Inline form for create/edit */}
      {activeFormMode !== null && workspaceId && (
        <Box sx={{ mb: 3 }}>
          <TransactionForm
            workspaceId={workspaceId}
            mode={activeFormMode}
            transactionId={editingTransaction?.id}
            initialData={activeFormMode === 'edit' && editingTransaction ? buildInitialData(editingTransaction) : undefined}
            onSuccess={handleFormClose}
            onCancel={handleFormClose}
          />
        </Box>
      )}

      {/* Filter bar */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
        <TextField
          label={t('transactionsPage.dateFrom')}
          type="date"
          value={filterForm.dateFrom}
          onChange={(e) => updateFilterForm({ dateFrom: e.target.value })}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
          inputProps={{ 'data-testid': 'filter-date-from' }}
        />
        <TextField
          label={t('transactionsPage.dateTo')}
          type="date"
          value={filterForm.dateTo}
          onChange={(e) => updateFilterForm({ dateTo: e.target.value })}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
          inputProps={{ 'data-testid': 'filter-date-to' }}
        />
        <Autocomplete
          options={typeOptions}
          value={typeOptions.find((o) => o.id === filterForm.transactionTypeId) ?? null}
          onChange={(_, v) => updateFilterForm({ transactionTypeId: v?.id ?? undefined })}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => (
            <TextField {...params} label={t('transactionsPage.transactionType')} size="small" />
          )}
          sx={{ minWidth: 200 }}
          size="small"
        />
        <Autocomplete
          options={accountOptions}
          value={accountOptions.find((o) => o.id === filterForm.accountId) ?? null}
          onChange={(_, v) => updateFilterForm({ accountId: v?.id ?? undefined })}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => (
            <TextField {...params} label={t('transactionsPage.account')} size="small" />
          )}
          sx={{ minWidth: 220 }}
          size="small"
        />
        <Button variant="outlined" onClick={handleApplyFilters} data-testid="apply-filters-btn">
          {t('transactionsPage.applyFilters')}
        </Button>
        <IconButton onClick={handleClearFilters} aria-label={t('transactionsPage.clearFilters')} data-testid="clear-filters-btn">
          <FilterAltOffIcon />
        </IconButton>
      </Box>

      {isLoading && <Typography>{t('transactionsPage.loading')}</Typography>}
      {isError && <ErrorMessage error={error ?? null} />}

      {!isLoading && !isError && (
        <Table size="small" data-testid="transactions-table">
          <TableHead>
            <TableRow>
              <TableCell>{t('transactionsPage.date')}</TableCell>
              <TableCell>{t('transactionsPage.type')}</TableCell>
              <TableCell>{t('transactionsPage.number')}</TableCell>
              <TableCell>{t('transactionsPage.description')}</TableCell>
              <TableCell align="right">{t('common.debit')}</TableCell>
              <TableCell align="right">{t('common.credit')}</TableCell>
              <TableCell>{t('transactionsPage.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>{t('transactionsPage.noTransactions')}</TableCell>
              </TableRow>
            )}
            {transactions.map((txn) => {
              const { debit, credit } = getTransactionTotals(txn)
              return (
                <Fragment key={txn.id}>
                  {/* Transaction summary row */}
                  <TableRow data-testid={`txn-row-${txn.id}`}>
                    <TableCell sx={{ py: 0.75 }}>{txn.date}</TableCell>
                    <TableCell sx={{ py: 0.75 }}>{txn.transactionTypeName}</TableCell>
                    <TableCell sx={{ py: 0.75 }}>{txn.transactionNumber}</TableCell>
                    <TableCell sx={{ py: 0.75 }}>{txn.description}</TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>
                      {debit > 0 ? formatMoney(debit, baseCurrency) : ''}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>
                      {credit > 0 ? formatMoney(credit, baseCurrency) : ''}
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditTransaction(txn)}
                        aria-label={t('common.edit')}
                        data-testid={`edit-txn-${txn.id}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {/* Line item rows */}
                  {(txn.items ?? []).map((item, itemIndex) => (
                    <TableRow key={`${txn.id}-item-${itemIndex}`} sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ py: 0.5, pl: 4 }} colSpan={4}>
                        {item.accountCode} {item.accountName}
                        {item.thirdPartyName && ` / ${item.thirdPartyName}`}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.875em' }}>
                        {item.debitAmount && item.debitAmount !== 0 ? formatItemAmount(item.debitAmount, item.currency) : ''}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.875em' }}>
                        {item.creditAmount && item.creditAmount !== 0 ? formatItemAmount(item.creditAmount, item.currency) : ''}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }} />
                    </TableRow>
                  ))}

                  {/* Visual separator row */}
                  <TableRow sx={{ height: 4 }}>
                    <TableCell
                      colSpan={7}
                      sx={{
                        p: 0,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  </TableRow>
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      )}

      {!isError && (
        <TablePagination
          component="div"
          count={totalCount}
          page={Math.min(page, Math.max(0, Math.ceil(totalCount / rowsPerPage) - 1))}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          labelRowsPerPage={t('transactionsPage.rowsPerPage')}
        />
      )}
    </Box>
  )
}

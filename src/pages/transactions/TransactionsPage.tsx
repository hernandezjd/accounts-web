import { useState, Fragment } from 'react'
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
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import { useTranslation } from 'react-i18next'
import { useTransactions, type Transaction, type TransactionFilters } from '@/hooks/api/useTransactions'
import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { InitialDateConfigurationAlert } from '@/components/ui/InitialDateConfigurationAlert'
import { TransactionForm, type TransactionFormInitialData } from '../accounting/TransactionForm'

// ─── TransactionsPage ──────────────────────────────────────────────────────────

export function TransactionsPage() {
  const { t } = useTranslation()
  const { tenantId = '' } = useParams<{ tenantId: string }>()

  // Filter state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>(undefined)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined)
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>({})

  // Inline form state
  const [activeFormMode, setActiveFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const { data: transactions, isLoading, isError, error } = useTransactions(tenantId || null, appliedFilters)
  const { data: transactionTypes } = useTransactionTypes()
  const { data: accounts } = useAccounts(tenantId || null)
  const { data: tenantConfig } = useTenantConfig(tenantId || null)

  const initialDateMissing = !tenantConfig?.systemInitialDate

  const typeOptions = (transactionTypes ?? []).map((tt) => ({ id: tt.id!, name: tt.name! }))
  const accountOptions = (accounts ?? []).map((a) => ({ id: a.id!, label: `${a.code} — ${a.name}` }))

  function formatAmount(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function getTransactionTotals(txn: Transaction): { debit: number; credit: number } {
    return {
      debit: (txn.items ?? []).reduce((sum, item) => sum + (item.debitAmount ?? 0), 0),
      credit: (txn.items ?? []).reduce((sum, item) => sum + (item.creditAmount ?? 0), 0),
    }
  }

  const handleApplyFilters = () => {
    setAppliedFilters({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      transactionTypeId: selectedTypeId,
      accountId: selectedAccountId,
    })
  }

  const handleClearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSelectedTypeId(undefined)
    setSelectedAccountId(undefined)
    setAppliedFilters({})
  }

  const buildInitialData = (txn: Transaction): TransactionFormInitialData => ({
    transactionTypeId: txn.transactionTypeId ?? '',
    transactionTypeName: txn.transactionTypeName ?? '',
    transactionNumber: txn.transactionNumber ?? '',
    date: txn.date ?? '',
    description: txn.description ?? '',
    items: (txn.items ?? []).map((item) => ({
      accountId: item.accountId ?? '',
      accountCode: item.accountCode ?? '',
      accountName: item.accountName ?? '',
      hasThirdParties: false,
      thirdPartyId: item.thirdPartyId ?? null,
      thirdPartyName: item.thirdPartyName ?? null,
      debitAmount: item.debitAmount ?? 0,
      creditAmount: item.creditAmount ?? 0,
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewTransaction}
            disabled={initialDateMissing}
            data-testid="new-transaction-btn"
          >
            {t('transactionsPage.newTransaction')}
          </Button>
        )}
      </Box>

      {initialDateMissing && (
        <InitialDateConfigurationAlert
          tenantId={tenantId}
          messageKey="transactionsPage.initialDateNotConfiguredWarning"
          testId="initial-date-warning"
        />
      )}

      {/* Inline form for create/edit */}
      {activeFormMode !== null && tenantId && (
        <Box sx={{ mb: 3 }}>
          <TransactionForm
            tenantId={tenantId}
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
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
          inputProps={{ 'data-testid': 'filter-date-from' }}
        />
        <TextField
          label={t('transactionsPage.dateTo')}
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
          inputProps={{ 'data-testid': 'filter-date-to' }}
        />
        <Autocomplete
          options={typeOptions}
          value={typeOptions.find((o) => o.id === selectedTypeId) ?? null}
          onChange={(_, v) => setSelectedTypeId(v?.id ?? undefined)}
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
          value={accountOptions.find((o) => o.id === selectedAccountId) ?? null}
          onChange={(_, v) => setSelectedAccountId(v?.id ?? undefined)}
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
            {(transactions ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>{t('transactionsPage.noTransactions')}</TableCell>
              </TableRow>
            )}
            {(transactions ?? []).map((txn) => {
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
                      {debit > 0 ? formatAmount(debit) : ''}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>
                      {credit > 0 ? formatAmount(credit) : ''}
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
                        {item.debitAmount && item.debitAmount !== 0 ? formatAmount(item.debitAmount) : ''}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.875em' }}>
                        {item.creditAmount && item.creditAmount !== 0 ? formatAmount(item.creditAmount) : ''}
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
    </Box>
  )
}

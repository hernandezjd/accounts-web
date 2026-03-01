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
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import { useTranslation } from 'react-i18next'
import { useTransactions, type Transaction, type TransactionFilters } from '@/hooks/api/useTransactions'
import { useTransactionTypes } from '@/hooks/api/useTransactionTypes'
import { useAccounts } from '@/hooks/api/useAccounts'
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

  const { data: transactions, isLoading, isError } = useTransactions(tenantId || null, appliedFilters)
  const { data: transactionTypes } = useTransactionTypes()
  const { data: accounts } = useAccounts(tenantId || null)

  const typeOptions = (transactionTypes ?? []).map((tt) => ({ id: tt.id!, name: tt.name! }))
  const accountOptions = (accounts ?? []).map((a) => ({ id: a.id!, label: `${a.code} — ${a.name}` }))

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
            data-testid="new-transaction-btn"
          >
            {t('transactionsPage.newTransaction')}
          </Button>
        )}
      </Box>

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
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 160 }}
          inputProps={{ 'data-testid': 'filter-date-from' }}
        />
        <TextField
          label={t('transactionsPage.dateTo')}
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
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
      {isError && <Alert severity="error">{t('transactionsPage.error')}</Alert>}

      {!isLoading && !isError && (
        <Table size="small" data-testid="transactions-table">
          <TableHead>
            <TableRow>
              <TableCell>{t('transactionsPage.date')}</TableCell>
              <TableCell>{t('transactionsPage.type')}</TableCell>
              <TableCell>{t('transactionsPage.number')}</TableCell>
              <TableCell>{t('transactionsPage.description')}</TableCell>
              <TableCell>{t('transactionsPage.items')}</TableCell>
              <TableCell>{t('transactionsPage.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(transactions ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>{t('transactionsPage.noTransactions')}</TableCell>
              </TableRow>
            )}
            {(transactions ?? []).map((txn) => (
              <TableRow key={txn.id} data-testid={`txn-row-${txn.id}`}>
                <TableCell>{txn.date}</TableCell>
                <TableCell>{txn.transactionTypeName}</TableCell>
                <TableCell>{txn.transactionNumber}</TableCell>
                <TableCell>{txn.description}</TableCell>
                <TableCell>{txn.items?.length ?? 0}</TableCell>
                <TableCell>
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
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}

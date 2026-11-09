import { useState, useEffect, useCallback, Fragment } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import type { Granularity } from '@/types/accounting'
import { useAccountTransactionsInPeriod } from '@/hooks/api/useAccountTransactionsInPeriod'
import { useTransactionById } from '@/hooks/api/useTransactionById'
import { useTransactionMutations } from '@/hooks/api/useTransactionMutations'
import { useCurrencyView } from '@/hooks/useCurrencyView'
import { useCurrencyViewStore } from '@/store/currencyViewStore'
import { useExtraCurrencyStatements } from '@/hooks/api/useExtraCurrencyStatements'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { PeriodControls } from './PeriodControls'
import { TransactionForm, type TransactionFormInitialData, type FormMode } from './TransactionForm'
import { formatMoney } from '@/utils/money'

interface TransactionViewProps {
  workspaceId: string
  accountId: string
  accountName: string
  accountCode: string
  thirdPartyId?: string
  thirdPartyName?: string
  from: string
  to: string
  granularity: Granularity
  onBack: () => void
  onPrevPeriod: () => void
  onNextPeriod: () => void
  onGranularityChange: (g: Granularity) => void
}

interface FormConfig {
  mode: FormMode
  transactionId?: string
  initialData?: TransactionFormInitialData
}

export function TransactionView({
  workspaceId,
  accountId,
  accountName,
  accountCode,
  thirdPartyId,
  thirdPartyName,
  from,
  to,
  granularity,
  onBack,
  onPrevPeriod,
  onNextPeriod,
  onGranularityChange,
}: TransactionViewProps) {
  const { t } = useTranslation()
  const { data, isLoading, isError, error: apiError, refetch } = useAccountTransactionsInPeriod(
    workspaceId,
    accountId,
    from,
    to,
    thirdPartyId,
  )

  // Format error for display with classification
  const formattedError = apiError ?? null
  // The query service answers 400 when the account (and its descendants) does not track the chosen currency
  const { view, baseCurrency } = useCurrencyView(workspaceId)
  const chosenExtra = useCurrencyViewStore((s) => s.extraCurrencies)
  const extraCurrencies = chosenExtra.filter((c) => c !== (view.currency ?? baseCurrency))
  const extraColumns = useExtraCurrencyStatements(workspaceId, accountId, from, to, extraCurrencies, thirdPartyId)
  const untrackedCurrency =
    isError && formattedError?.errorCode === 'VALIDATION_ERROR' && view.currency ? view.currency : null

  // ── Form state ──
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null)
  const [deletingTxnId, setDeletingTxnId] = useState<string | null>(null)

  // ── Fetch transaction to edit ──
  const { data: editTxnData, isSuccess: editFetched } = useTransactionById(
    workspaceId,
    editingTxnId,
  )

  useEffect(() => {
    if (editFetched && editTxnData && editingTxnId) {
      const txn = editTxnData
      const initialData: TransactionFormInitialData = {
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
          hasThirdParties: !!(item.thirdPartyId),
          thirdPartyId: item.thirdPartyId ?? null,
          thirdPartyName: item.thirdPartyName ?? null,
          debitAmount: item.debitAmount ?? 0,
          creditAmount: item.creditAmount ?? 0,
          equivalents: (item.equivalents ?? []).map((e) => ({ currency: e.currency, amount: e.amount })),
        })),
      }
      setFormConfig({ mode: 'edit', transactionId: editingTxnId, initialData })
      setEditingTxnId(null)
    }
  }, [editFetched, editTxnData, editingTxnId])

  // ── Keyboard shortcut: n = new transaction ────────────────────────────────
  useKeyboardShortcut(
    'n',
    t('accounting.shortcuts.newTransaction'),
    useCallback(() => {
      if (!formConfig) setFormConfig({ mode: 'create' })
    }, [formConfig]),
  )

  // ── Delete ──
  const { deleteTransaction } = useTransactionMutations(workspaceId)

  const handleDeleteConfirm = () => {
    if (!deletingTxnId) return
    deleteTransaction.mutate(deletingTxnId, {
      onSuccess: () => setDeletingTxnId(null),
      onError: () => setDeletingTxnId(null),
    })
  }

  const headerTitle = thirdPartyName
    ? `${accountCode} ${accountName} / ${thirdPartyName}`
    : `${accountCode} ${accountName}`

  const handleFormSuccess = () => setFormConfig(null)
  const handleFormCancel = () => setFormConfig(null)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          variant="outlined"
          size="small"
          aria-label={t('common.back')}
        >
          {t('common.back')}
        </Button>
        <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
          {headerTitle}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormConfig({ mode: 'create' })}
          aria-label={t('transactionForm.newTransaction')}
        >
          {t('transactionForm.newTransaction')}
        </Button>
      </Box>

      <PeriodControls
        from={from}
        to={to}
        granularity={granularity}
        onPrevPeriod={onPrevPeriod}
        onNextPeriod={onNextPeriod}
        onGranularityChange={onGranularityChange}
      />

      {/* Inline form panel */}
      <Collapse in={Boolean(formConfig)} unmountOnExit>
        {formConfig && (
          <Box sx={{ mt: 2 }}>
            <TransactionForm
              workspaceId={workspaceId}
              mode={formConfig.mode}
              transactionId={formConfig.transactionId}
              initialData={formConfig.initialData}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </Box>
        )}
      </Collapse>

      <Box sx={{ mt: 2 }}>
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
              base: baseCurrency ?? '',
            })}
          </Alert>
        )}

        {isError && !untrackedCurrency && (
          <ErrorMessage error={formattedError} onRetry={() => void refetch()} />
        )}

        {data && !isLoading && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} data-testid="statement-summary">
              {([
                ['openingBalance', data.openingBalance],
                ['totalDebits', data.totalDebits],
                ['totalCredits', data.totalCredits],
                ['closingBalance', data.closingBalance],
              ] as const).map(([key, value], index) => (
                <Fragment key={key}>
                  {index > 0 && ' · '}
                  {t(`accounting.transactions.${key}`)}:{' '}
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {formatMoney(value, data.currency, { withCode: key === 'closingBalance' })}
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

            {data.transactions.length === 0 ? (
              <Typography color="text.secondary">
                {t('accounting.transactions.noTransactions')}
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {t('accounting.transactions.date')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {t('accounting.transactions.type')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {t('accounting.transactions.number')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {t('accounting.transactions.description')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {t('accounting.transactions.debit')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {t('accounting.transactions.credit')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {t('accounting.transactions.runningBalance')}
                      </TableCell>
                      {extraColumns.map((column) => (
                        <TableCell key={column.currency} align="right" sx={{ fontWeight: 700 }}>
                          {t('accounting.transactions.balanceIn', { currency: column.currency })}
                        </TableCell>
                      ))}
                      <TableCell sx={{ fontWeight: 700, width: 80 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.transactions.map((txn, _) => {
                      const debit = txn.debitAmount
                      const credit = txn.creditAmount

                      return (
                        <Fragment key={txn.transactionId}>
                          {/* Transaction summary row */}
                          <TableRow hover>
                            <TableCell sx={{ py: 0.75 }}>{txn.date}</TableCell>
                            <TableCell sx={{ py: 0.75 }}>{txn.transactionTypeName}</TableCell>
                            <TableCell sx={{ py: 0.75, fontFamily: 'monospace' }}>
                              {txn.transactionNumber}
                            </TableCell>
                            <TableCell sx={{ py: 0.75 }}>{txn.description ?? ''}</TableCell>
                            <TableCell align="right" sx={{ py: 0.75 }}>
                              {debit !== 0 ? formatMoney(debit, data.currency) : ''}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.75 }}>
                              {credit !== 0 ? formatMoney(credit, data.currency) : ''}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.75, fontWeight: 600 }}>
                              {formatMoney(txn.runningBalance, data.currency)}
                            </TableCell>
                            {extraColumns.map((column) => {
                              const balance = column.runningBalanceByTransaction.get(txn.transactionId)
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
                            <TableCell sx={{ py: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => setEditingTxnId(txn.transactionId)}
                                aria-label={`${t('common.edit')} ${txn.transactionNumber}`}
                                data-testid={`edit-txn-${txn.transactionId}`}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeletingTxnId(txn.transactionId)}
                                aria-label={`${t('common.delete')} ${txn.transactionNumber}`}
                                data-testid={`delete-txn-${txn.transactionId}`}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>

                          {/* Line item rows */}
                          {txn.items.map((item, itemIndex) => (
                            <TableRow key={`${txn.transactionId}-item-${itemIndex}`} sx={{ bgcolor: 'action.hover' }}>
                              <TableCell sx={{ py: 0.5, pl: 4 }} colSpan={3}>
                                {item.accountCode} {item.accountName}
                                {item.thirdPartyName && ` / ${item.thirdPartyName}`}
                              </TableCell>
                              <TableCell sx={{ py: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                                {(item.equivalents ?? [])
                                  .map((e) => `≈ ${formatMoney(e.amount, e.currency, { withCode: true })}`)
                                  .join(' · ')}
                              </TableCell>
                              <TableCell align="right" sx={{ py: 0.5 }}>
                                {item.debitAmount !== 0
                                  ? formatMoney(item.debitAmount, item.currency ?? data.currency, { withCode: true })
                                  : ''}
                              </TableCell>
                              <TableCell align="right" sx={{ py: 0.5 }}>
                                {item.creditAmount !== 0
                                  ? formatMoney(item.creditAmount, item.currency ?? data.currency, { withCode: true })
                                  : ''}
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }} />
                              {extraColumns.map((column) => (
                                <TableCell key={column.currency} sx={{ py: 0.5 }} />
                              ))}
                              <TableCell sx={{ py: 0.5 }} />
                            </TableRow>
                          ))}

                          {/* Visual separator row after transaction */}
                          <TableRow sx={{ height: 4 }}>
                            <TableCell
                              colSpan={8 + extraColumns.length}
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
              </TableContainer>
            )}
          </>
        )}
      </Box>

      {/* Editing indicator */}
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

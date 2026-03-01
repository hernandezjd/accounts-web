import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useTranslation } from 'react-i18next'
import type { Granularity } from '@/types/accounting'
import { useAccountTransactionsInPeriod } from '@/hooks/api/useAccountTransactionsInPeriod'
import { PeriodControls } from './PeriodControls'

interface TransactionViewProps {
  tenantId: string
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

function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TransactionView({
  tenantId,
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
  const { data, isLoading, isError } = useAccountTransactionsInPeriod(
    tenantId,
    accountId,
    from,
    to,
    thirdPartyId,
  )

  const headerTitle = thirdPartyName
    ? `${accountCode} ${accountName} / ${thirdPartyName}`
    : `${accountCode} ${accountName}`

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          variant="outlined"
          size="small"
          aria-label={t('common.back')}
        >
          {t('common.back')}
        </Button>
        <Typography variant="h6" component="h2">
          {headerTitle}
        </Typography>
      </Box>

      <PeriodControls
        from={from}
        to={to}
        granularity={granularity}
        onPrevPeriod={onPrevPeriod}
        onNextPeriod={onNextPeriod}
        onGranularityChange={onGranularityChange}
      />

      <Box sx={{ mt: 2 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
            <CircularProgress size={24} />
            <Typography color="text.secondary">{t('accounting.transactions.loading')}</Typography>
          </Box>
        )}

        {isError && (
          <Typography color="error">{t('accounting.transactions.error')}</Typography>
        )}

        {data && !isLoading && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('accounting.transactions.openingBalance')}:{' '}
              <Box component="span" sx={{ fontWeight: 600 }}>
                {formatAmount(data.openingBalance)}
              </Box>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.transactions.map((txn) => {
                      // Find the item that matches the queried account (and TP if applicable)
                      const matchingItem = txn.items.find(
                        (item) =>
                          item.accountId === accountId &&
                          (!thirdPartyId || item.thirdPartyId === thirdPartyId),
                      )
                      const debit = matchingItem?.debitAmount ?? 0
                      const credit = matchingItem?.creditAmount ?? 0

                      return (
                        <TableRow key={txn.transactionId} hover>
                          <TableCell sx={{ py: 0.75 }}>{txn.date}</TableCell>
                          <TableCell sx={{ py: 0.75 }}>{txn.transactionTypeName}</TableCell>
                          <TableCell sx={{ py: 0.75, fontFamily: 'monospace' }}>
                            {txn.transactionNumber}
                          </TableCell>
                          <TableCell sx={{ py: 0.75 }}>{txn.description ?? ''}</TableCell>
                          <TableCell align="right" sx={{ py: 0.75 }}>
                            {debit !== 0 ? formatAmount(debit) : ''}
                          </TableCell>
                          <TableCell align="right" sx={{ py: 0.75 }}>
                            {credit !== 0 ? formatAmount(credit) : ''}
                          </TableCell>
                          <TableCell align="right" sx={{ py: 0.75, fontWeight: 600 }}>
                            {formatAmount(txn.runningBalance)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

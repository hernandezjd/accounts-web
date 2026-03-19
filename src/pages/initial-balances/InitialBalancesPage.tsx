import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useInitialBalances } from '@/hooks/api/useInitialBalances'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { InitialDateConfigurationAlert } from '@/components/ui/InitialDateConfigurationAlert'
import { formatError } from '@/lib/error/useErrorHandler'
import { TransactionForm, type TransactionFormInitialData, type FormMode } from '@/pages/accounting/TransactionForm'

interface FormConfig {
  mode: FormMode
  transactionId?: string
  initialData?: TransactionFormInitialData
}

export function InitialBalancesPage() {
  const { t } = useTranslation()
  const { tenantId } = useParams<{ tenantId: string }>()
  const { data, isLoading, isError, error: apiError, refetch } = useInitialBalances(tenantId)
  const { data: tenantConfig } = useTenantConfig(tenantId)
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)

  // Format error for display with classification
  const formattedError = apiError ? formatError(apiError, (apiError as any)?.status) : null

  if (!tenantId) return null

  const initialDateMissing = !tenantConfig?.systemInitialDate

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          {t('initialBalances.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormConfig({ mode: 'createInitialBalance' })}
          disabled={!!formConfig || initialDateMissing}
        >
          {t('initialBalances.newInitialBalance')}
        </Button>
      </Box>

      {initialDateMissing && (
        <InitialDateConfigurationAlert
          tenantId={tenantId}
          messageKey="initialBalances.initialDateNotConfiguredWarning"
          testId="initial-date-warning"
        />
      )}

      <Collapse in={Boolean(formConfig)} unmountOnExit>
        {formConfig && (
          <Box sx={{ mb: 3 }}>
            <TransactionForm
              tenantId={tenantId}
              mode={formConfig.mode}
              transactionId={formConfig.transactionId}
              initialData={formConfig.initialData}
              onSuccess={() => setFormConfig(null)}
              onCancel={() => setFormConfig(null)}
            />
          </Box>
        )}
      </Collapse>

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">{t('initialBalances.loading')}</Typography>
        </Box>
      )}

      {isError && <ErrorMessage error={formattedError} onRetry={() => void refetch()} />}

      {data && !isLoading && (
        data.length === 0 ? (
          <Typography color="text.secondary">{t('initialBalances.noData')}</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('initialBalances.number')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('initialBalances.description')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('initialBalances.date')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('initialBalances.items')}</TableCell>
                  <TableCell sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((ib) => (
                  <TableRow key={ib.id} hover>
                    <TableCell sx={{ py: 0.75, fontFamily: 'monospace' }}>{ib.transactionNumber}</TableCell>
                    <TableCell sx={{ py: 0.75 }}>{ib.description ?? ''}</TableCell>
                    <TableCell sx={{ py: 0.75 }}>{ib.initialDate}</TableCell>
                    <TableCell sx={{ py: 0.75 }}>{ib.items?.length ?? 0}</TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const initialData: TransactionFormInitialData = {
                            transactionTypeId: '',
                            transactionTypeName: '',
                            transactionNumber: ib.transactionNumber ?? '',
                            date: ib.initialDate ?? '',
                            description: ib.description ?? '',
                            items: (ib.items ?? []).map((item) => ({
                              accountId: item.accountId ?? '',
                              accountCode: item.accountCode ?? '',
                              accountName: item.accountName ?? '',
                              hasThirdParties: !!item.thirdPartyId,
                              thirdPartyId: item.thirdPartyId ?? null,
                              thirdPartyName: item.thirdPartyName ?? null,
                              debitAmount: item.debitAmount ?? 0,
                              creditAmount: item.creditAmount ?? 0,
                            })),
                          }
                          setFormConfig({ mode: 'editInitialBalance', transactionId: ib.id, initialData })
                        }}
                        aria-label={`${t('common.edit')} ${ib.transactionNumber}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Box>
  )
}

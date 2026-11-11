import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useInitialBalances } from '@/hooks/api/useInitialBalances'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { InitialDateConfigurationAlert } from '@/components/ui/InitialDateConfigurationAlert'
import type { TransactionFormInitialData, FormMode } from '@/pages/accounting/TransactionForm'
import { TransactionFormDialog } from '@/pages/accounting/TransactionFormDialog'
import { useRowFlash } from '@/hooks/useRowFlash'

interface FormConfig {
  mode: FormMode
  transactionId?: string
  initialData?: TransactionFormInitialData
}

export function InitialBalancesPage() {
  const { t } = useTranslation()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { data, isLoading, isError, error: apiError, refetch } = useInitialBalances(workspaceId)
  const { data: workspaceConfig } = useWorkspaceConfig(workspaceId)
  const { hasWorkspaceAccess } = useWorkspaceAccess()
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)
  // The saved row is highlighted for a moment, so the user sees where the change landed
  const [flashedId, flashRow] = useRowFlash()

  // Format error for display with classification
  const formattedError = apiError ?? null

  if (!workspaceId) return null

  const initialDateMissing = !workspaceConfig?.systemInitialDate
  const hasAccess = hasWorkspaceAccess(workspaceId)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {t('initialBalances.title')}
        </Typography>
        <Tooltip title={!!formConfig || initialDateMissing ? t('common.insufficientPermissions') : ''}>
          <span>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormConfig({ mode: 'createInitialBalance' })}
              disabled={!!formConfig || initialDateMissing}
            >
              {t('initialBalances.newInitialBalance')}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {initialDateMissing && hasAccess && (
        <InitialDateConfigurationAlert
          workspaceId={workspaceId}
          messageKey="initialBalances.initialDateNotConfiguredWarning"
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
          onSuccess={() => {
            if (formConfig.transactionId) flashRow(formConfig.transactionId)
            setFormConfig(null)
          }}
          onClose={() => setFormConfig(null)}
        />
      )}

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
                  <TableRow
                    key={ib.id}
                    hover
                    sx={{
                      transition: 'background-color 0.4s',
                      bgcolor: flashedId === ib.id ? 'primary.light' : undefined,
                    }}
                  >
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
                              equivalents: (item.equivalents ?? []).map((e) => ({ currency: e.currency, amount: e.amount })),
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

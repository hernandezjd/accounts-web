import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { usePeriodReport, type PeriodReportWithClosureResponse, type PeriodReportResponse } from '@/hooks/api/usePeriodReport'
import { useBalanceAtLevel } from '@/hooks/api/useBalanceAtLevel'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
import { ErrorMessage } from '@/components/error/ErrorMessage'

// ─── Type guards & Helpers ──────────────────────────────────────────────────

function isPeriodReportWithClosure(data: PeriodReportResponse | PeriodReportWithClosureResponse): data is PeriodReportWithClosureResponse {
  return 'entries' in data && data.entries.length > 0 && 'original' in data.entries[0]
}

// Helper to format amounts
function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Helper to determine if a simulated value should be highlighted in blue (closure-related)
function isNominalOrPLAccount(
  accountId: string | undefined,
  nominalAccountIds: string[] | undefined,
  plAccountId: string | undefined,
): boolean {
  if (!accountId || (!nominalAccountIds && !plAccountId)) return false
  if (nominalAccountIds?.includes(accountId)) return true
  if (plAccountId && accountId === plAccountId) return true
  return false
}

// ─── Tab panel helper ────────────────────────────────────────────────────────

interface TabPanelProps {
  children: React.ReactNode
  value: number
  index: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} data-testid={`tabpanel-${index}`}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

// ─── Period Report Tab ───────────────────────────────────────────────────────

interface PeriodReportTabProps {
  tenantId: string
  systemInitialDate?: string | null
  simulateClosure?: boolean
  nominalAccountIds?: string[]
  plAccountId?: string
}

function PeriodReportTab({ tenantId, systemInitialDate, simulateClosure = false, nominalAccountIds, plAccountId }: PeriodReportTabProps) {
  const { t } = useTranslation()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [levelStr, setLevelStr] = useState('')
  const [appliedParams, setAppliedParams] = useState<{
    fromDate: string
    toDate: string
    level?: number
    enabled: boolean
  }>({ fromDate: '', toDate: '', enabled: false })

  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data, isLoading, isError, error: apiError, refetch } = usePeriodReport(
    tenantId,
    appliedParams.fromDate,
    appliedParams.toDate,
    appliedParams.level,
    simulateClosure,
    appliedParams.enabled,
  )

  // Format error for display with classification
  const formattedError = apiError ?? null

  const isFromDateBeforeInitial = !!(systemInitialDate && fromDate && fromDate < systemInitialDate)
  const isToDateBeforeInitial = !!(systemInitialDate && toDate && toDate < systemInitialDate)

  const handleRun = () => {
    const level = levelStr ? parseInt(levelStr, 10) : undefined
    setAppliedParams({ fromDate, toDate, level, enabled: true })
    setExpandedRow(null)
  }

  const toggleRow = (accountId: string) => {
    setExpandedRow((prev) => (prev === accountId ? null : accountId))
  }

  return (
    <Box>
      {systemInitialDate && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('reports.dateRangeRestriction', { initialDate: systemInitialDate })}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>
        <TextField
          label={t('reports.form.fromDate')}
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          inputProps={{ min: systemInitialDate || '', 'data-testid': 'period-from-date' }}
          error={isFromDateBeforeInitial}
          helperText={isFromDateBeforeInitial ? t('reports.dateBeforeInitial') : ''}
        />
        <TextField
          label={t('reports.form.toDate')}
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          inputProps={{ min: systemInitialDate || '', 'data-testid': 'period-to-date' }}
          error={isToDateBeforeInitial}
          helperText={isToDateBeforeInitial ? t('reports.dateBeforeInitial') : ''}
        />
        <TextField
          label={t('reports.form.levelOptional')}
          type="number"
          size="small"
          value={levelStr}
          onChange={(e) => setLevelStr(e.target.value)}
          inputProps={{ min: 1, 'data-testid': 'period-level' }}
          sx={{ width: 200 }}
        />
        <Button
          variant="contained"
          onClick={handleRun}
          disabled={!fromDate || !toDate || isFromDateBeforeInitial || isToDateBeforeInitial}
          data-testid="run-period-report-btn"
        >
          {t('reports.form.run')}
        </Button>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={20} />
          <Typography>{t('reports.periodReport.loading')}</Typography>
        </Box>
      )}

      {isError && (
        <ErrorMessage error={formattedError} onRetry={() => void refetch()} />
      )}

      {!isLoading && !isError && data && data.entries.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('reports.periodReport.noData')}
        </Typography>
      )}

      {!isLoading && !isError && data && data.entries.length > 0 && (() => {
        const isClosureResponse = isPeriodReportWithClosure(data)
        const colSpan = isClosureResponse ? 8 : 6
        return (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" data-testid="period-report-table">
              <TableHead>
                <TableRow>
                  <TableCell>{t('reports.periodReport.code')}</TableCell>
                  <TableCell>{t('reports.periodReport.name')}</TableCell>
                  <TableCell align="right">{t('reports.periodReport.level')}</TableCell>
                  <TableCell align="right">{t('reports.periodReport.opening')}</TableCell>
                  {isClosureResponse && <TableCell align="right">{t('reports.periodReport.openingSimulated')}</TableCell>}
                  <TableCell align="right">{t('reports.periodReport.txnCount')}</TableCell>
                  <TableCell align="right">{t('reports.periodReport.closing')}</TableCell>
                  {isClosureResponse && <TableCell align="right">{t('reports.periodReport.closingSimulated')}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.entries.map((entry) => {
                  const original = isClosureResponse ? (entry as any).original : entry as any
                  const simulated = isClosureResponse ? (entry as any).simulated : null
                  const hasTransactions = original.periodTransactions?.length > 0
                  const isClosureRelated = isNominalOrPLAccount(original.accountId, nominalAccountIds, plAccountId)
                  const showSimulatedAsBlue = isClosureResponse && simulated !== null && simulated !== undefined && isClosureRelated

                  return (
                    <>
                      <TableRow
                        hover
                        onClick={() => toggleRow(original.accountId)}
                        sx={{ cursor: hasTransactions ? 'pointer' : 'default' }}
                        data-testid={`period-row-${original.accountId}`}
                      >
                        <TableCell>{original.accountCode}</TableCell>
                        <TableCell>{original.accountName}</TableCell>
                        <TableCell align="right">{original.level}</TableCell>
                        <TableCell align="right">{formatAmount(original.openingBalance)}</TableCell>
                        {isClosureResponse && <TableCell align="right" sx={showSimulatedAsBlue ? { color: 'primary.main' } : {}}>{formatAmount(simulated?.openingBalance)}</TableCell>}
                        <TableCell align="right">{hasTransactions ? original.periodTransactions.length : 0}</TableCell>
                        <TableCell align="right">{formatAmount(original.closingBalance)}</TableCell>
                        {isClosureResponse && <TableCell align="right" sx={showSimulatedAsBlue ? { color: 'primary.main' } : {}}>{formatAmount(simulated?.closingBalance)}</TableCell>}
                      </TableRow>
                      {hasTransactions && (
                        <TableRow key={`${original.accountId}-expand`}>
                          <TableCell colSpan={colSpan} sx={{ p: 0, border: 0 }}>
                            <Collapse in={expandedRow === original.accountId} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 1, pl: 4, bgcolor: 'action.hover' }}>
                                <Table size="small" data-testid={`period-txns-${entry.accountId}`}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Date</TableCell>
                                      <TableCell>Type</TableCell>
                                      <TableCell>Number</TableCell>
                                      <TableCell align="right">Debit</TableCell>
                                      <TableCell align="right">Credit</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {original.periodTransactions.map((txn: any) => (
                                      <TableRow key={txn.transactionId}>
                                        <TableCell>{txn.date}</TableCell>
                                        <TableCell>{txn.transactionTypeName}</TableCell>
                                        <TableCell>{txn.transactionNumber}</TableCell>
                                        <TableCell align="right">{formatAmount(txn.debitAmount)}</TableCell>
                                        <TableCell align="right">{formatAmount(txn.creditAmount)}</TableCell>
                                      </TableRow>
                                    ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )
      })()}
    </Box>
  )
}

// ─── Balance at Date Tab ─────────────────────────────────────────────────────

interface BalanceAtDateTabProps {
  tenantId: string
  systemInitialDate?: string | null
  simulateClosure?: boolean
  nominalAccountIds?: string[]
  plAccountId?: string
}

function BalanceAtDateTab({ tenantId, systemInitialDate, simulateClosure = false, nominalAccountIds, plAccountId }: BalanceAtDateTabProps) {
  const { t } = useTranslation()
  const [date, setDate] = useState('')
  const [appliedDate, setAppliedDate] = useState('')
  const [enabled, setEnabled] = useState(false)

  const { data, isLoading, isError, error: apiError, refetch } = usePeriodReport(
    tenantId,
    appliedDate,
    appliedDate,
    undefined,
    simulateClosure,
    enabled,
  )

  // Format error for display with classification
  const formattedError = apiError ?? null

  const isDateBeforeInitial = !!(systemInitialDate && date && date < systemInitialDate)

  const handleRun = () => {
    setAppliedDate(date)
    setEnabled(true)
  }

  return (
    <Box>
      {systemInitialDate && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('reports.dateRangeRestriction', { initialDate: systemInitialDate })}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>
        <TextField
          label={t('reports.form.date')}
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          inputProps={{ min: systemInitialDate || '', 'data-testid': 'balance-date' }}
          error={isDateBeforeInitial}
          helperText={isDateBeforeInitial ? t('reports.dateBeforeInitial') : ''}
        />
        <Button
          variant="contained"
          onClick={handleRun}
          disabled={!date || isDateBeforeInitial}
          data-testid="run-balance-at-date-btn"
        >
          {t('reports.form.run')}
        </Button>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={20} />
          <Typography>{t('reports.balanceAtDate.loading')}</Typography>
        </Box>
      )}

      {isError && (
        <ErrorMessage error={formattedError} onRetry={() => void refetch()} />
      )}

      {!isLoading && !isError && data && data.entries.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('reports.balanceAtDate.noData')}
        </Typography>
      )}

      {!isLoading && !isError && data && data.entries.length > 0 && (() => {
        const isClosureResponse = simulateClosure && 'original' in (data.entries[0] || {})
        return (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" data-testid="balance-at-date-table">
              <TableHead>
                <TableRow>
                  <TableCell>{t('reports.balanceAtDate.code')}</TableCell>
                  <TableCell>{t('reports.balanceAtDate.name')}</TableCell>
                  <TableCell align="right">{t('reports.balanceAtDate.level')}</TableCell>
                  <TableCell align="right">{t('reports.balanceAtDate.balance')}</TableCell>
                  {isClosureResponse && (
                    <TableCell align="right">{t('reports.balanceAtDate.balanceSimulated')}</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.entries.map((entry: any) => {
                  const original = isClosureResponse ? (entry as any).original : (entry as any)
                  const simulated = isClosureResponse ? (entry as any).simulated : null
                  const isClosureRelated = isNominalOrPLAccount(original.accountId, nominalAccountIds, plAccountId)
                  const showSimulatedAsBlue = isClosureResponse && simulated !== null && isClosureRelated

                  return (
                    <TableRow key={original.accountId} data-testid={`balance-row-${original.accountId}`}>
                      <TableCell>{original.accountCode}</TableCell>
                      <TableCell>{original.accountName}</TableCell>
                      <TableCell align="right">{original.level}</TableCell>
                      <TableCell align="right">
                        {formatAmount(original.closingBalance)}
                      </TableCell>
                      {isClosureResponse && (
                        <TableCell align="right" sx={showSimulatedAsBlue ? { color: 'primary.main' } : undefined}>
                          {simulated !== null ? formatAmount(simulated.closingBalance) : '—'}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )
      })()}
    </Box>
  )
}

// ─── Balance at Level Tab ────────────────────────────────────────────────────

interface BalanceAtLevelTabProps {
  tenantId: string
  systemInitialDate?: string | null
  simulateClosure?: boolean
  nominalAccountIds?: string[]
  plAccountId?: string
}

function BalanceAtLevelTab({ tenantId, systemInitialDate, simulateClosure = false, nominalAccountIds, plAccountId }: BalanceAtLevelTabProps) {
  const { t } = useTranslation()
  const [date, setDate] = useState('')
  const [levelStr, setLevelStr] = useState('')
  const [appliedParams, setAppliedParams] = useState<{
    date: string
    level: number | undefined
    enabled: boolean
  }>({ date: '', level: undefined, enabled: false })

  const { data, isLoading, isError, error: apiError, refetch } = useBalanceAtLevel(
    tenantId,
    appliedParams.date,
    appliedParams.level,
    simulateClosure,
    appliedParams.enabled,
  )

  // Format error for display with classification
  const formattedError = apiError ?? null

  const isDateBeforeInitial = !!(systemInitialDate && date && date < systemInitialDate)
  const canRun = Boolean(date) && Boolean(levelStr) && parseInt(levelStr, 10) >= 1 && !isDateBeforeInitial

  const handleRun = () => {
    const level = levelStr ? parseInt(levelStr, 10) : undefined
    setAppliedParams({ date, level, enabled: true })
  }

  return (
    <Box>
      {systemInitialDate && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('reports.dateRangeRestriction', { initialDate: systemInitialDate })}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>
        <TextField
          label={t('reports.form.date')}
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          inputProps={{ min: systemInitialDate || '', 'data-testid': 'level-date' }}
          error={isDateBeforeInitial}
          helperText={isDateBeforeInitial ? t('reports.dateBeforeInitial') : ''}
        />
        <TextField
          label={t('reports.form.level')}
          type="number"
          size="small"
          value={levelStr}
          onChange={(e) => setLevelStr(e.target.value)}
          inputProps={{ min: 1, 'data-testid': 'level-input' }}
          sx={{ width: 160 }}
        />
        <Button
          variant="contained"
          onClick={handleRun}
          disabled={!canRun}
          data-testid="run-balance-at-level-btn"
        >
          {t('reports.form.run')}
        </Button>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={20} />
          <Typography>{t('reports.balanceAtLevel.loading')}</Typography>
        </Box>
      )}

      {isError && (
        <ErrorMessage error={formattedError} onRetry={() => void refetch()} />
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('reports.balanceAtLevel.noData')}
        </Typography>
      )}

      {!isLoading && !isError && data && data.length > 0 && (() => {
        const isClosureResponse = simulateClosure && 'original' in (data[0] || {})
        return (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" data-testid="balance-at-level-table">
              <TableHead>
                <TableRow>
                  <TableCell>{t('reports.balanceAtLevel.code')}</TableCell>
                  <TableCell>{t('reports.balanceAtLevel.name')}</TableCell>
                  <TableCell align="right">{t('reports.balanceAtLevel.initialBalance')}</TableCell>
                  <TableCell align="right">{t('reports.balanceAtLevel.runningBalance')}</TableCell>
                  <TableCell align="right">{t('reports.balanceAtLevel.totalBalance')}</TableCell>
                  {isClosureResponse && (
                    <TableCell align="right">{t('reports.balanceAtLevel.totalBalanceSimulated')}</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((entry: any) => {
                  const original = isClosureResponse ? (entry as any).original : (entry as any)
                  const simulated = isClosureResponse ? (entry as any).simulated : null
                  const isClosureRelated = isNominalOrPLAccount(original.accountId, nominalAccountIds, plAccountId)
                  const showSimulatedAsBlue = isClosureResponse && simulated !== null && isClosureRelated

                  return (
                    <TableRow key={original.accountId} data-testid={`level-row-${original.accountId}`}>
                      <TableCell>{original.accountCode}</TableCell>
                      <TableCell>{original.accountName}</TableCell>
                      <TableCell align="right">{formatAmount(original.initialBalance)}</TableCell>
                      <TableCell align="right">{formatAmount(original.runningBalance)}</TableCell>
                      <TableCell align="right">
                        {formatAmount(original.totalBalance)}
                      </TableCell>
                      {isClosureResponse && (
                        <TableCell align="right" sx={showSimulatedAsBlue ? { color: 'primary.main' } : undefined}>
                          {simulated !== null ? formatAmount(simulated.totalBalance) : '—'}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )
      })()}
    </Box>
  )
}

// ─── ReportsPage ─────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { t } = useTranslation()
  const { tenantId = '' } = useParams<{ tenantId: string }>()
  const [activeTab, setActiveTab] = useState(0)
  const [simulateClosure, setSimulateClosure] = useState(false)
  const [showMissingConfigWarning, setShowMissingConfigWarning] = useState(false)
  const { data: tenantConfig } = useTenantConfig(tenantId)

  // Extract nominal accounts and P&L account from config
  const nominalAccountIds = tenantConfig?.nominalAccounts ?? undefined
  const plAccountId = tenantConfig?.profitLossAccountId ?? undefined

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t('reports.title')}
      </Typography>

      {simulateClosure && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" data-testid="simulation-active-banner">
            {t('reports.simulateModeActive')}
          </Alert>
          <Alert severity="info" sx={{ mt: 1 }} data-testid="simulation-info-banner">
            {t('reports.closureSimulationInfo')}
          </Alert>
        </Box>
      )}

      {showMissingConfigWarning && !simulateClosure && (() => {
        const hasNominal = nominalAccountIds && nominalAccountIds.length > 0
        const hasPnl = !!plAccountId
        const messageKey = !hasNominal && !hasPnl
          ? 'reports.closureMissingBoth'
          : !hasNominal
            ? 'reports.closureMissingNominal'
            : 'reports.closureMissingPnl'
        return (
          <Alert severity="warning" sx={{ mb: 2 }} data-testid="simulation-missing-config-banner">
            {t(messageKey)}{' '}
            <Link to="../setup" state={{ initialTab: 1, initialEditMode: 'nominalAccounts' }} data-testid="missing-config-link">
              {t('reports.closureMissingConfigLink')}
            </Link>
          </Alert>
        )
      })()}

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} data-testid="reports-tabs">
        <Tab label={t('reports.tabs.periodReport')} data-testid="tab-period-report" />
        <Tab label={t('reports.tabs.balanceAtDate')} data-testid="tab-balance-at-date" />
        <Tab label={t('reports.tabs.balanceAtLevel')} data-testid="tab-balance-at-level" />
        </Tabs>
        <FormControlLabel
          sx={{ ml: 'auto' }}
          control={
            <Switch
              checked={simulateClosure}
              onChange={(e) => {
                const wantOn = e.target.checked
                if (wantOn) {
                  const hasNominal = nominalAccountIds && nominalAccountIds.length > 0
                  const hasPnl = !!plAccountId
                  if (!hasNominal || !hasPnl) {
                    setShowMissingConfigWarning(true)
                    return
                  }
                }
                setShowMissingConfigWarning(false)
                setSimulateClosure(wantOn)
              }}
              data-testid="simulate-closure-toggle"
            />
          }
          label={t('reports.simulateClosureToggle')}
        />
      </Box>

      <TabPanel value={activeTab} index={0}>
        <PeriodReportTab tenantId={tenantId} systemInitialDate={tenantConfig?.systemInitialDate} simulateClosure={simulateClosure} nominalAccountIds={nominalAccountIds} plAccountId={plAccountId} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <BalanceAtDateTab tenantId={tenantId} systemInitialDate={tenantConfig?.systemInitialDate} simulateClosure={simulateClosure} nominalAccountIds={nominalAccountIds} plAccountId={plAccountId} />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <BalanceAtLevelTab tenantId={tenantId} systemInitialDate={tenantConfig?.systemInitialDate} simulateClosure={simulateClosure} nominalAccountIds={nominalAccountIds} plAccountId={plAccountId} />
      </TabPanel>
    </Box>
  )
}

import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { useErrorHandler } from '@accounts/error-handling-web'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import {
  useExchangeRateMutations,
  useExchangeRates,
  useRateJobRuns,
  useRateSources,
} from '@/hooks/api/useExchangeRates'

/**
 * Maintenance of the global exchange-rate table (MC-16, MC-17): the rates with their history, the free sources the
 * scheduled job reads, its latest runs (a failed run is shown as an alert) and manual entry or correction of a rate.
 * Needs the global action manage_exchange_rates; without it the server answers 403, which is shown as an error.
 */
export function RatesTab() {
  const { t } = useTranslation()
  const { error, setError, clearError } = useErrorHandler()
  const [filters, setFilters] = useState({ base: '', currency: '', includeSuperseded: false })
  const { data: rates } = useExchangeRates({ ...filters })
  const { data: sources } = useRateSources()
  const { data: runs } = useRateJobRuns()
  const { putRate, createSource, deleteSource, runJob } = useExchangeRateMutations()

  const [manual, setManual] = useState({ baseCurrency: '', currency: '', rateDate: '', rate: '' })
  const [source, setSource] = useState({ name: '', urlTemplate: '', jsonPath: '', priority: '100' })

  const lastRun = runs?.[0]
  const onError = (err: unknown) => setError(err as never)

  return (
    <Box data-testid="rates-tab">
      <ErrorMessage error={error} onDismiss={clearError} />

      {lastRun?.status === 'FAILED' && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="rates-job-failed-alert">
          {t('rates.jobFailed', { date: lastRun.finishedAt ?? lastRun.startedAt })}
          {lastRun.message ? ` — ${lastRun.message}` : ''}
        </Alert>
      )}

      {/* Rates */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {t('rates.rates')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('rates.base')}
          value={filters.base}
          onChange={(e) => setFilters({ ...filters, base: e.target.value.toUpperCase() })}
          sx={{ width: 100 }}
        />
        <TextField
          size="small"
          label={t('currency.currency')}
          value={filters.currency}
          onChange={(e) => setFilters({ ...filters, currency: e.target.value.toUpperCase() })}
          sx={{ width: 100 }}
        />
        <Button
          size="small"
          onClick={() => setFilters({ ...filters, includeSuperseded: !filters.includeSuperseded })}
        >
          {filters.includeSuperseded ? t('rates.hideSuperseded') : t('rates.showSuperseded')}
        </Button>
        <Button size="small" variant="outlined" onClick={() => runJob.mutate(undefined, { onError })} disabled={runJob.isPending}>
          {t('rates.runNow')}
        </Button>
      </Box>
      <Table size="small" sx={{ mb: 2 }} data-testid="rates-table">
        <TableHead>
          <TableRow>
            <TableCell>{t('rates.date')}</TableCell>
            <TableCell>{t('rates.base')}</TableCell>
            <TableCell>{t('currency.currency')}</TableCell>
            <TableCell align="right">{t('currency.rate')}</TableCell>
            <TableCell>{t('rates.source')}</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {(rates ?? []).map((rate) => (
            <TableRow key={rate.id} sx={rate.superseded ? { opacity: 0.5 } : undefined}>
              <TableCell>{rate.rateDate}</TableCell>
              <TableCell>{rate.baseCurrency}</TableCell>
              <TableCell>{rate.currency}</TableCell>
              <TableCell align="right">{rate.rate}</TableCell>
              <TableCell>{rate.source}</TableCell>
              <TableCell>{rate.superseded ? t('rates.superseded') : ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {t('rates.enterRate')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" label={t('rates.base')} value={manual.baseCurrency}
          onChange={(e) => setManual({ ...manual, baseCurrency: e.target.value.toUpperCase() })} sx={{ width: 100 }} />
        <TextField size="small" label={t('currency.currency')} value={manual.currency}
          onChange={(e) => setManual({ ...manual, currency: e.target.value.toUpperCase() })} sx={{ width: 100 }} />
        <TextField size="small" type="date" label={t('rates.date')} value={manual.rateDate}
          onChange={(e) => setManual({ ...manual, rateDate: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField size="small" label={t('currency.rate')} value={manual.rate}
          onChange={(e) => setManual({ ...manual, rate: e.target.value.replace(',', '.') })} sx={{ width: 160 }}
          helperText={t('rates.rateHelp')} />
        <Button
          variant="contained"
          disabled={!manual.baseCurrency || !manual.currency || !manual.rateDate || !(parseFloat(manual.rate) > 0) || putRate.isPending}
          onClick={() => {
            clearError()
            putRate.mutate(
              { baseCurrency: manual.baseCurrency, currency: manual.currency, rateDate: manual.rateDate, rate: parseFloat(manual.rate) },
              { onSuccess: () => setManual({ ...manual, rate: '' }), onError },
            )
          }}
          data-testid="save-rate-btn"
        >
          {t('common.save')}
        </Button>
      </Box>

      {/* Sources */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {t('rates.sources')}
      </Typography>
      <Table size="small" sx={{ mb: 1 }} data-testid="rate-sources-table">
        <TableHead>
          <TableRow>
            <TableCell>{t('rates.priority')}</TableCell>
            <TableCell>{t('rates.name')}</TableCell>
            <TableCell>{t('rates.url')}</TableCell>
            <TableCell>{t('rates.jsonPath')}</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {(sources ?? []).map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.priority}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell sx={{ wordBreak: 'break-all' }}>{row.urlTemplate}</TableCell>
              <TableCell>{row.jsonPath}</TableCell>
              <TableCell>
                <IconButton size="small" aria-label={t('common.delete')} onClick={() => deleteSource.mutate(row.id!, { onError })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" label={t('rates.name')} value={source.name}
          onChange={(e) => setSource({ ...source, name: e.target.value })} />
        <TextField size="small" label={t('rates.url')} value={source.urlTemplate} sx={{ minWidth: 320 }}
          onChange={(e) => setSource({ ...source, urlTemplate: e.target.value })} helperText={t('rates.urlHelp')} />
        <TextField size="small" label={t('rates.jsonPath')} value={source.jsonPath}
          onChange={(e) => setSource({ ...source, jsonPath: e.target.value })} />
        <TextField size="small" label={t('rates.priority')} value={source.priority} sx={{ width: 100 }}
          onChange={(e) => setSource({ ...source, priority: e.target.value.replace(/[^0-9]/g, '') })} />
        <Button
          variant="contained"
          disabled={!source.name || !source.urlTemplate || !source.jsonPath || createSource.isPending}
          onClick={() => {
            clearError()
            createSource.mutate(
              { name: source.name, urlTemplate: source.urlTemplate, jsonPath: source.jsonPath, priority: parseInt(source.priority || '100', 10), enabled: true },
              { onSuccess: () => setSource({ name: '', urlTemplate: '', jsonPath: '', priority: '100' }), onError },
            )
          }}
          data-testid="add-source-btn"
        >
          {t('rates.addSource')}
        </Button>
      </Box>

      {/* Job runs */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {t('rates.jobRuns')}
      </Typography>
      <Table size="small" data-testid="rate-job-runs-table">
        <TableHead>
          <TableRow>
            <TableCell>{t('rates.startedAt')}</TableCell>
            <TableCell>{t('rates.status')}</TableCell>
            <TableCell align="right">{t('rates.pairsOk')}</TableCell>
            <TableCell align="right">{t('rates.pairsFailed')}</TableCell>
            <TableCell>{t('rates.message')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(runs ?? []).map((run) => (
            <TableRow key={run.id}>
              <TableCell>{run.startedAt}</TableCell>
              <TableCell>{run.status}</TableCell>
              <TableCell align="right">{run.pairsOk}</TableCell>
              <TableCell align="right">{run.pairsFailed}</TableCell>
              <TableCell>{run.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import {
  usePrefilledCharts,
  usePrefilledChartDetail,
  useMergePrefilledChart,
} from '@/hooks/api/usePrefilledCharts'
import type { MergeReportResponse } from '@/hooks/api/usePrefilledCharts'

export function PrefilledChartsTab() {
  const { t } = useTranslation()
  const { tenantId = '' } = useParams<{ tenantId: string }>()
  const { data: charts, isLoading, error } = usePrefilledCharts()
  const mergeMutation = useMergePrefilledChart(tenantId)

  const [viewChartId, setViewChartId] = useState<string | null>(null)
  const [mergeChartId, setMergeChartId] = useState<string | null>(null)
  const [mergeReport, setMergeReport] = useState<MergeReportResponse | null>(null)

  const { data: chartDetail } = usePrefilledChartDetail(viewChartId)

  const handleMerge = async () => {
    if (!mergeChartId) return
    try {
      const report = await mergeMutation.mutateAsync(mergeChartId)
      setMergeChartId(null)
      setMergeReport(report)
    } catch {
      // error is available via mergeMutation.error
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{t('prefilledCharts.error')}</Alert>
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('prefilledCharts.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('prefilledCharts.description')}
      </Typography>

      {mergeMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mergeMutation.error?.message}
        </Alert>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('prefilledCharts.name')}</TableCell>
            <TableCell>{t('prefilledCharts.descriptionColumn')}</TableCell>
            <TableCell align="right">{t('prefilledCharts.accountCount')}</TableCell>
            <TableCell align="right">{t('prefilledCharts.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {charts?.map((chart) => (
            <TableRow key={chart.id}>
              <TableCell>{chart.name}</TableCell>
              <TableCell>{chart.description}</TableCell>
              <TableCell align="right">{chart.accountCount}</TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  onClick={() => setViewChartId(chart.id)}
                  data-testid={`view-${chart.id}`}
                >
                  {t('prefilledCharts.view')}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setMergeChartId(chart.id)}
                  disabled={!tenantId || mergeMutation.isPending}
                  data-testid={`merge-${chart.id}`}
                  sx={{ ml: 1 }}
                >
                  {t('prefilledCharts.merge')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* View Dialog */}
      <Dialog
        open={viewChartId !== null}
        onClose={() => setViewChartId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{chartDetail?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {chartDetail?.description}
          </Typography>
          {chartDetail && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('prefilledCharts.code')}</TableCell>
                  <TableCell>{t('prefilledCharts.accountName')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chartDetail.accounts.map((acc) => (
                  <TableRow key={acc.code}>
                    <TableCell>{acc.code}</TableCell>
                    <TableCell>{acc.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewChartId(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Merge Confirmation Dialog */}
      <Dialog open={mergeChartId !== null} onClose={() => setMergeChartId(null)}>
        <DialogTitle>{t('prefilledCharts.mergeConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('prefilledCharts.mergeConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeChartId(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleMerge}
            disabled={mergeMutation.isPending}
            data-testid="confirm-merge"
          >
            {mergeMutation.isPending ? <CircularProgress size={20} /> : t('prefilledCharts.merge')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Merge Report Dialog */}
      <Dialog
        open={mergeReport !== null}
        onClose={() => setMergeReport(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('prefilledCharts.mergeReportTitle')}</DialogTitle>
        <DialogContent>
          {mergeReport && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip
                  label={`${t('prefilledCharts.totalAccounts')}: ${mergeReport.totalAccounts}`}
                />
                <Chip
                  label={`${t('prefilledCharts.merged')}: ${mergeReport.mergedCount}`}
                  color="success"
                />
                <Chip
                  label={`${t('prefilledCharts.skipped')}: ${mergeReport.skippedCount}`}
                  color={mergeReport.skippedCount > 0 ? 'warning' : 'default'}
                />
              </Box>

              {mergeReport.merged.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    {t('prefilledCharts.mergedAccounts')}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('prefilledCharts.code')}</TableCell>
                        <TableCell>{t('prefilledCharts.accountName')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mergeReport.merged.map((a) => (
                        <TableRow key={a.code}>
                          <TableCell>{a.code}</TableCell>
                          <TableCell>{a.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              {mergeReport.skipped.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    {t('prefilledCharts.skippedAccounts')}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('prefilledCharts.code')}</TableCell>
                        <TableCell>{t('prefilledCharts.accountName')}</TableCell>
                        <TableCell>{t('prefilledCharts.reason')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mergeReport.skipped.map((a) => (
                        <TableRow key={a.code}>
                          <TableCell>{a.code}</TableCell>
                          <TableCell>{a.name}</TableCell>
                          <TableCell>{a.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeReport(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

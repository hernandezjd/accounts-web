import { useState, useEffect } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { useExecuteClosingMutation } from '@/hooks/api/useExecuteClosingMutation'
import { useClosingPreview } from '@/hooks/api/useClosingPreview'
import { useErrorHandler } from '@accounts/error-handling-web'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { formatMoney } from '@/utils/money'
import type { components as Reporting } from '@/api/generated/reporting-api'
import type { FormattedError } from '@accounts/error-handling-web'

type ClosingAccountLine = Reporting['schemas']['ClosingAccountLine']
type ClosingPreview = Reporting['schemas']['ClosingPreviewResponse']

interface ClosingDialogProps {
  workspaceId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type DialogStage = 'input' | 'preview'

/** Debits and credits of the whole closing in each currency; the closing balances in every one (MC-25). */
function closingTotals(preview: ClosingPreview) {
  const totals = new Map<string, { currency: string; debits: number; credits: number }>()
  const lines = [...(preview.nominalAccountLines ?? []), ...(preview.profitLossLines ?? [])]
  for (const line of lines) {
    for (const amount of line.amounts) {
      const total = totals.get(amount.currency) ?? { currency: amount.currency, debits: 0, credits: 0 }
      total.debits += amount.debitAmount
      total.credits += amount.creditAmount
      totals.set(amount.currency, total)
    }
  }
  return [...totals.values()]
}

export function ClosingDialog({ workspaceId, open, onClose, onSuccess }: ClosingDialogProps) {
  const { t } = useTranslation()
  const { executeClosing } = useExecuteClosingMutation(workspaceId)

  const [stage, setStage] = useState<DialogStage>('input')
  const [closingDate, setClosingDate] = useState('')
  const [description, setDescription] = useState('')
  // REQ-CLOSE-12: lock the period up to the closing date before the closing is computed
  const [lockPeriod, setLockPeriod] = useState(false)
  const { error, setError, clearError } = useErrorHandler()
  const [showPreviewFetch, setShowPreviewFetch] = useState(false)

  // Fetch closing preview when dates are available and preview is requested
  const { data: preview, isLoading: isLoadingPreview, error: previewError } = useClosingPreview(
    workspaceId,
    showPreviewFetch ? closingDate : null,
    showPreviewFetch ? description : null,
    showPreviewFetch,
  )

  // Update error message when preview fetch fails
  useEffect(() => {
    if (previewError) {
      setError(previewError as FormattedError)
    }
  }, [previewError, setError])

  // Move to preview stage when preview data is loaded
  useEffect(() => {
    if (preview && stage === 'input') {
      setStage('preview')
      clearError()
    }
  }, [preview, stage, clearError])

  const handleInputClose = () => {
    setStage('input')
    setClosingDate('')
    setDescription('')
    setLockPeriod(false)
    clearError()
    setShowPreviewFetch(false)
    onClose()
  }

  const handlePreview = () => {
    clearError()
    if (!closingDate) {
      const validationError: FormattedError = {
        errorCode: 'VALIDATION_ERROR',
        userMessage: t('closing.dateRequired'),
        requestId: 'local-validation',
        timestamp: new Date().toISOString(),
        showSupportContact: false,
        classification: 'validation' as any,
        isRetryable: false,
        severity: 'error',
      }
      setError(validationError)
      return
    }
    if (!description.trim()) {
      const validationError: FormattedError = {
        errorCode: 'VALIDATION_ERROR',
        userMessage: t('closing.descriptionRequired'),
        requestId: 'local-validation',
        timestamp: new Date().toISOString(),
        showSupportContact: false,
        classification: 'validation' as any,
        isRetryable: false,
        severity: 'error',
      }
      setError(validationError)
      return
    }

    // Trigger the preview fetch
    setShowPreviewFetch(true)
  }

  const handleExecute = async () => {
    clearError()
    executeClosing.mutate(
      { date: closingDate, description, lockPeriod },
      {
        onSuccess: () => {
          setStage('input')
          setClosingDate('')
          setDescription('')
          setLockPeriod(false)
          setShowPreviewFetch(false)
          onSuccess()
          handleInputClose()
        },
        onError: (err) => setError(err as FormattedError),
      },
    )
  }

  const handleBackToInput = () => {
    setStage('input')
    clearError()
    setShowPreviewFetch(false)
  }

  return (
    <Dialog open={open} onClose={handleInputClose} maxWidth="sm" fullWidth>
      {stage === 'input' ? (
        <>
          <DialogTitle>{t('closing.executeClosing')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ErrorMessage error={error} onDismiss={clearError} />
            <TextField
              label={t('closing.closingDate')}
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              size="small"
              inputProps={{ 'data-testid': 'closing-date-input' }}
            />
            <TextField
              label={t('closing.description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              required
              size="small"
              inputProps={{ 'data-testid': 'closing-description-input' }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={lockPeriod}
                  onChange={(e) => setLockPeriod(e.target.checked)}
                />
              }
              label={t('closing.lockPeriod')}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleInputClose}>{t('common.cancel')}</Button>
            <Button
              onClick={handlePreview}
              variant="contained"
              disabled={isLoadingPreview || !closingDate || !description.trim()}
              data-testid="closing-preview-button"
            >
              {isLoadingPreview ? <CircularProgress size={24} /> : t('closing.preview')}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>{t('closing.previewClosing')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ErrorMessage error={error} onDismiss={clearError} />
            {preview && (
              <>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('closing.closingDetails')}
                  </Typography>
                  <Typography variant="body2">
                    {t('closing.date')}: {preview.closingDate}
                  </Typography>
                  <Typography variant="body2">
                    {t('closing.description')}: {preview.description}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('closing.nominalAccounts')}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>{t('closing.accountCode')}</TableCell>
                        <TableCell>{t('closing.accountName')}</TableCell>
                        <TableCell>{t('currency.currency')}</TableCell>
                        <TableCell align="right">{t('closing.debits')}</TableCell>
                        <TableCell align="right">{t('closing.credits')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.nominalAccountLines?.flatMap((line: ClosingAccountLine) =>
                        line.amounts.map((amount) => (
                          <TableRow key={`${line.accountId}-${amount.currency}`}>
                            <TableCell>{line.accountCode}</TableCell>
                            <TableCell>{line.accountName}</TableCell>
                            <TableCell>{amount.currency}</TableCell>
                            <TableCell align="right">{formatMoney(amount.debitAmount, amount.currency)}</TableCell>
                            <TableCell align="right">{formatMoney(amount.creditAmount, amount.currency)}</TableCell>
                          </TableRow>
                        )),
                      )}
                    </TableBody>
                  </Table>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('closing.profitLossAccount')}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>{t('closing.accountCode')}</TableCell>
                        <TableCell>{t('closing.accountName')}</TableCell>
                        <TableCell>{t('currency.currency')}</TableCell>
                        <TableCell align="right">{t('closing.debits')}</TableCell>
                        <TableCell align="right">{t('closing.credits')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.profitLossLines?.flatMap((line) =>
                        line.amounts.map((amount) => (
                          <TableRow key={`${line.accountId}-${amount.currency}`}>
                            <TableCell>{line.accountCode}</TableCell>
                            <TableCell>{line.accountName}</TableCell>
                            <TableCell>{amount.currency}</TableCell>
                            <TableCell align="right">{formatMoney(amount.debitAmount, amount.currency)}</TableCell>
                            <TableCell align="right">{formatMoney(amount.creditAmount, amount.currency)}</TableCell>
                          </TableRow>
                        )),
                      )}
                    </TableBody>
                  </Table>
                </Box>

                <Box sx={{ pt: 1, borderTop: '1px solid #e0e0e0' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {t('closing.totals')}:
                  </Typography>
                  {closingTotals(preview).map((total) => (
                    <Typography variant="body2" key={total.currency}>
                      {total.currency} — {t('closing.totalDebits')}:{' '}
                      {formatMoney(total.debits, total.currency, { withCode: true })},{' '}
                      {t('closing.totalCredits')}: {formatMoney(total.credits, total.currency, { withCode: true })}
                    </Typography>
                  ))}
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBackToInput}>{t('common.back')}</Button>
            <Button onClick={handleInputClose}>{t('common.cancel')}</Button>
            <Button
              onClick={handleExecute}
              variant="contained"
              disabled={executeClosing.isPending}
              data-testid="closing-execute-button"
            >
              {executeClosing.isPending ? <CircularProgress size={24} /> : t('closing.executeNow')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

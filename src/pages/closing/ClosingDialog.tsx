import { useState, useEffect } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
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
import { useErrorHandler } from '@/lib/error/useErrorHandler'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import type { components as Reporting } from '@/api/generated/reporting-api'
import type { FormattedError } from '@/lib/error/useErrorHandler'

type ClosingAccountLine = Reporting['schemas']['ClosingAccountLine']

interface ClosingDialogProps {
  tenantId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type DialogStage = 'input' | 'preview'

function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ClosingDialog({ tenantId, open, onClose, onSuccess }: ClosingDialogProps) {
  const { t } = useTranslation()
  const { executeClosing } = useExecuteClosingMutation(tenantId)

  const [stage, setStage] = useState<DialogStage>('input')
  const [closingDate, setClosingDate] = useState('')
  const [description, setDescription] = useState('')
  const { error, setError, clearError } = useErrorHandler()
  const [showPreviewFetch, setShowPreviewFetch] = useState(false)

  // Fetch closing preview when dates are available and preview is requested
  const { data: preview, isLoading: isLoadingPreview, error: previewError } = useClosingPreview(
    tenantId,
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
      { date: closingDate, description },
      {
        onSuccess: () => {
          setStage('input')
          setClosingDate('')
          setDescription('')
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
                        <TableCell align="right">{t('closing.debits')}</TableCell>
                        <TableCell align="right">{t('closing.credits')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.nominalAccountLines?.map((line: ClosingAccountLine) => (
                        <TableRow key={line.accountId}>
                          <TableCell>{line.accountCode}</TableCell>
                          <TableCell>{line.accountName}</TableCell>
                          <TableCell align="right">{formatAmount(line.debitAmount)}</TableCell>
                          <TableCell align="right">{formatAmount(line.creditAmount)}</TableCell>
                        </TableRow>
                      ))}
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
                        <TableCell align="right">{t('closing.debits')}</TableCell>
                        <TableCell align="right">{t('closing.credits')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.profitLossLine && (
                        <TableRow>
                          <TableCell>{preview.profitLossLine.accountCode}</TableCell>
                          <TableCell>{preview.profitLossLine.accountName}</TableCell>
                          <TableCell align="right">{formatAmount(preview.profitLossLine.debitAmount)}</TableCell>
                          <TableCell align="right">{formatAmount(preview.profitLossLine.creditAmount)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>

                <Box sx={{ pt: 1, borderTop: '1px solid #e0e0e0' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {t('closing.totals')}:
                  </Typography>
                  <Typography variant="body2">
                    {t('closing.totalDebits')}: {formatAmount(preview.totalDebits)}
                  </Typography>
                  <Typography variant="body2">
                    {t('closing.totalCredits')}: {formatAmount(preview.totalCredits)}
                  </Typography>
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

import { useState, useEffect } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
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
import { translateApiError } from '@/utils/errorUtils'
import type { components as Reporting } from '@/api/generated/reporting-api'

type ClosingPreviewResponse = Reporting['schemas']['ClosingPreviewResponse']
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
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
      setErrorMsg(translateApiError(previewError, t))
    }
  }, [previewError])

  // Move to preview stage when preview data is loaded
  useEffect(() => {
    if (preview && stage === 'input') {
      setStage('preview')
      setErrorMsg(null)
    }
  }, [preview, stage])

  const handleInputClose = () => {
    setStage('input')
    setClosingDate('')
    setDescription('')
    setErrorMsg(null)
    setShowPreviewFetch(false)
    onClose()
  }

  const handlePreview = () => {
    setErrorMsg(null)
    if (!closingDate) {
      setErrorMsg(t('closing.dateRequired'))
      return
    }
    if (!description.trim()) {
      setErrorMsg(t('closing.descriptionRequired'))
      return
    }

    // Trigger the preview fetch
    setShowPreviewFetch(true)
  }

  const handleExecute = async () => {
    setErrorMsg(null)
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
        onError: (err) => setErrorMsg(translateApiError(err, t)),
      },
    )
  }

  const handleBackToInput = () => {
    setStage('input')
    setErrorMsg(null)
    setShowPreviewFetch(false)
  }

  return (
    <Dialog open={open} onClose={handleInputClose} maxWidth="sm" fullWidth>
      {stage === 'input' ? (
        <>
          <DialogTitle>{t('closing.executeClosing')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
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
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
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

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import ArchiveIcon from '@mui/icons-material/Archive'
import { ClosingDialog } from './ClosingDialog'

export function ClosingPage() {
  const { t } = useTranslation()
  const { tenantId } = useParams<{ tenantId: string }>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleOpenDialog = () => {
    setSuccessMessage(null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
  }

  const handleSuccess = () => {
    setSuccessMessage(t('closing.closingExecutedSuccessfully'))
    setDialogOpen(false)
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        {t('closing.accountClosing')}
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('closing.closingDescription')}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {t('closing.closingProcess')}
          </Typography>

          <Box sx={{ pt: 2 }}>
            <Button
              variant="contained"
              startIcon={<ArchiveIcon />}
              onClick={handleOpenDialog}
              data-testid="open-closing-dialog-button"
            >
              {t('closing.executeClosing')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {tenantId && (
        <ClosingDialog
          tenantId={tenantId}
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSuccess={handleSuccess}
        />
      )}
    </Box>
  )
}

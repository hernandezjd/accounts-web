import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import ArchiveIcon from '@mui/icons-material/Archive'
import { ClosingDialog } from './ClosingDialog'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'

export function ClosingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenantId } = useParams<{ tenantId: string }>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { data: config } = useTenantConfig(tenantId)

  const hasNominalAccounts = Boolean(config?.nominalAccounts && config.nominalAccounts.length > 0)
  const hasProfitLossAccount = Boolean(config?.profitLossAccountId)
  const hasClosingTransactionType = Boolean(config?.closingTransactionTypeId)
  const allPrerequisitesMet = hasNominalAccounts && hasProfitLossAccount && hasClosingTransactionType

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

  const navigateToAccountsConfig = () => {
    navigate(`/tenants/${tenantId}/setup`, {
      state: { initialTab: 1, initialEditMode: 'nominalAccounts' },
    })
  }

  const navigateToTransactionTypeConfig = () => {
    navigate(`/tenants/${tenantId}/setup`, {
      state: { initialTab: 1, initialEditMode: 'closingTransactionType' },
    })
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

      {config && !hasNominalAccounts && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="warning-nominal-accounts">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <span>{t('closing.prerequisiteNominalAccounts')}</span>
            <Button
              variant="outlined"
              size="small"
              onClick={navigateToAccountsConfig}
              sx={{ whiteSpace: 'nowrap' }}
              data-testid="warning-nominal-accounts-button"
            >
              {t('common.goToSetup')}
            </Button>
          </Box>
        </Alert>
      )}

      {config && !hasProfitLossAccount && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="warning-profit-loss-account">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <span>{t('closing.prerequisiteProfitLossAccount')}</span>
            <Button
              variant="outlined"
              size="small"
              onClick={navigateToAccountsConfig}
              sx={{ whiteSpace: 'nowrap' }}
              data-testid="warning-profit-loss-account-button"
            >
              {t('common.goToSetup')}
            </Button>
          </Box>
        </Alert>
      )}

      {config && !hasClosingTransactionType && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="warning-closing-transaction-type">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <span>{t('closing.prerequisiteClosingTransactionType')}</span>
            <Button
              variant="outlined"
              size="small"
              onClick={navigateToTransactionTypeConfig}
              sx={{ whiteSpace: 'nowrap' }}
              data-testid="warning-closing-transaction-type-button"
            >
              {t('common.goToSetup')}
            </Button>
          </Box>
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
              disabled={!allPrerequisitesMet}
              data-testid="open-closing-dialog-button"
            >
              {t('closing.preview')}
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

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

interface InitialDateConfigurationAlertProps {
  tenantId: string
  messageKey: string
  testId?: string
}

export function InitialDateConfigurationAlert({
  tenantId,
  messageKey,
  testId = 'initial-date-configuration-alert',
}: InitialDateConfigurationAlertProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleNavigateToSetup = () => {
    navigate(`/tenants/${tenantId}/setup`, {
      state: {
        initialTab: 1, // Accounting Config tab
        initialEditMode: 'initialDate', // Open system initial date dialog
      },
    })
  }

  return (
    <Alert severity="warning" sx={{ mb: 2 }} data-testid={testId}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
        <span>{t(messageKey)}</span>
        <Button
          variant="outlined"
          size="small"
          onClick={handleNavigateToSetup}
          sx={{ whiteSpace: 'nowrap' }}
          data-testid={`${testId}-button`}
        >
          {t('common.goToSetup')}
        </Button>
      </Box>
    </Alert>
  )
}

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import type { SxProps, Theme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

interface QueryErrorAlertProps {
  message: string
  onRetry?: () => void
  sx?: SxProps<Theme>
}

/**
 * Displays a query/load error with an optional retry button.
 * Used in place of generic error text on data-loading pages.
 */
export function QueryErrorAlert({ message, onRetry, sx }: QueryErrorAlertProps) {
  const { t } = useTranslation()

  return (
    <Alert
      severity="error"
      sx={sx}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            {t('errors.retry')}
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  )
}

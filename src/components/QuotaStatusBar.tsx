import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/appStore'
import { useOrganizationSubscription } from '@/hooks/api/useOrganizationSubscription'
import { useOrganizationQuotaUsage } from '@/hooks/api/useOrganizationQuotaUsage'

const UPGRADE_THRESHOLD = 80
const SUBSCRIPTION_WEB_URL = import.meta.env.VITE_SUBSCRIPTION_WEB_URL ?? 'http://localhost:5174'

function QuotaGauge({
  label,
  used,
  max,
  percentage,
  unlimited,
}: {
  label: string
  used: number
  max: number | null | undefined
  percentage: number | null | undefined
  unlimited: string
}) {
  if (max == null) {
    return (
      <Box sx={{ minWidth: 140 }}>
        <Typography variant="caption" color="text.secondary">
          {label}: {unlimited}
        </Typography>
      </Box>
    )
  }

  const pct = percentage ?? 0
  const color = pct >= UPGRADE_THRESHOLD ? 'warning' : 'primary'

  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">
        {label}: {used}/{max} ({Math.round(pct)}%)
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        color={color}
        sx={{ height: 4, borderRadius: 2, mt: 0.25 }}
      />
    </Box>
  )
}

export function QuotaStatusBar() {
  const { t } = useTranslation()
  const selectedOrgId = useAppStore((s) => s.selectedOrgId)

  const { data: subscription, isLoading: subLoading, error: subError } = useOrganizationSubscription(selectedOrgId)
  const { data: quota, isLoading: quotaLoading, error: quotaError } = useOrganizationQuotaUsage(selectedOrgId)

  if (!selectedOrgId) return null
  if (subLoading || quotaLoading) return null
  if (subError || quotaError) return null
  if (!subscription || !quota) return null

  const usersOverThreshold = quota.maxUsers != null && (quota.usersPercentage ?? 0) >= UPGRADE_THRESHOLD
  const txOverThreshold =
    quota.maxTransactionsPerMonth != null && (quota.transactionsPercentage ?? 0) >= UPGRADE_THRESHOLD
  const showUpgrade = usersOverThreshold || txOverThreshold

  const statusKey =
    subscription.status === 'ACTIVE'
      ? 'statusActive'
      : subscription.status === 'EXPIRED'
        ? 'statusExpired'
        : subscription.status === 'CANCELLED'
          ? 'statusCancelled'
          : 'statusSuspended'

  const expirationDate = new Date(subscription.expirationDate).toLocaleDateString()

  return (
    <Box
      data-testid="quota-status-bar"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        padding: '6px 12px',
        borderTop: '1px solid',
        borderColor: 'divider',
        marginTop: 'auto',
        fontSize: '0.75rem',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {t('subscription.planLabel')}:
        </Typography>
        <Chip label={subscription.plan.name} size="small" variant="outlined" />
        <Chip
          label={t(`subscription.${statusKey}`)}
          size="small"
          color={subscription.status === 'ACTIVE' ? 'success' : 'error'}
          variant="outlined"
        />
      </Box>

      <Typography variant="caption" color="text.secondary">
        {t('subscription.expiresLabel')}: {expirationDate}
      </Typography>

      <QuotaGauge
        label={t('subscription.usersLabel')}
        used={quota.activeUsers}
        max={quota.maxUsers}
        percentage={quota.usersPercentage}
        unlimited={t('subscription.unlimited')}
      />

      <QuotaGauge
        label={t('subscription.transactionsLabel')}
        used={quota.transactionsThisMonth}
        max={quota.maxTransactionsPerMonth}
        percentage={quota.transactionsPercentage}
        unlimited={t('subscription.unlimited')}
      />

      {showUpgrade && (
        <Button
          size="small"
          color="warning"
          variant="contained"
          onClick={() => window.open(SUBSCRIPTION_WEB_URL, '_blank')}
          sx={{ ml: 'auto' }}
        >
          {t('subscription.upgradeButton')}
        </Button>
      )}
    </Box>
  )
}

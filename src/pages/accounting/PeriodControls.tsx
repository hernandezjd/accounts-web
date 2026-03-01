import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { useTranslation } from 'react-i18next'
import type { SelectChangeEvent } from '@mui/material/Select'
import type { Granularity } from '@/types/accounting'
import { formatPeriodLabel } from '@/utils/period'

const GRANULARITIES: Granularity[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom']

interface PeriodControlsProps {
  from: string
  to: string
  granularity: Granularity
  onPrevPeriod: () => void
  onNextPeriod: () => void
  onGranularityChange: (g: Granularity) => void
}

export function PeriodControls({
  from,
  to,
  granularity,
  onPrevPeriod,
  onNextPeriod,
  onGranularityChange,
}: PeriodControlsProps) {
  const { t, i18n } = useTranslation()

  const label = formatPeriodLabel(from, to, granularity, i18n.language)

  function handleGranularityChange(e: SelectChangeEvent) {
    onGranularityChange(e.target.value as Granularity)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <IconButton
        onClick={onPrevPeriod}
        aria-label={t('accounting.period.prevPeriod')}
        size="small"
      >
        <NavigateBeforeIcon />
      </IconButton>

      <Typography variant="h6" component="span" sx={{ minWidth: 160, textAlign: 'center' }}>
        {label}
      </Typography>

      <IconButton
        onClick={onNextPeriod}
        aria-label={t('accounting.period.nextPeriod')}
        size="small"
      >
        <NavigateNextIcon />
      </IconButton>

      <Select
        native
        value={granularity}
        onChange={handleGranularityChange}
        size="small"
        sx={{ minWidth: 120 }}
      >
        {GRANULARITIES.map((g) => (
          <option key={g} value={g}>
            {t(`accounting.period.${g}`)}
          </option>
        ))}
      </Select>
    </Box>
  )
}

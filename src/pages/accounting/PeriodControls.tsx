import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Menu from '@mui/material/Menu'
import { useTranslation } from 'react-i18next'
import type { SelectChangeEvent } from '@mui/material/Select'
import type { Granularity } from '@/types/accounting'
import { formatPeriodLabel } from '@/utils/period'
import { PREFERENCE_KEYS } from '@/utils/preferences'
import type { CustomPeriodType } from './CustomPeriodTypeDialog'
import { CustomPeriodTypeDialog } from './CustomPeriodTypeDialog'

const GRANULARITIES: Granularity[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom']

interface PeriodControlsProps {
  from: string
  to: string
  granularity: Granularity
  onPrevPeriod: () => void
  onNextPeriod: () => void
  onGranularityChange: (g: Granularity) => void
  onFromChange?: (from: string) => void
  onToChange?: (to: string) => void
  systemInitialDate?: string | null
}

export function PeriodControls({
  from,
  to,
  granularity,
  onPrevPeriod,
  onNextPeriod,
  onGranularityChange,
  onFromChange,
  onToChange,
  systemInitialDate,
}: PeriodControlsProps) {
  const { t, i18n } = useTranslation()
  const [customPeriodTypes, setCustomPeriodTypes] = useState<CustomPeriodType[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedPeriodIdForDelete, setSelectedPeriodIdForDelete] = useState<string | null>(null)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')

  // Load custom period types from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PREFERENCE_KEYS.ACCOUNTING_CUSTOM_PERIOD_TYPES)
      if (stored) {
        setCustomPeriodTypes(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Error loading custom period types:', error)
    }
  }, [])

  const label = formatPeriodLabel(from, to, granularity, i18n.language)
  const isPrevDisabled = !!(systemInitialDate && from <= systemInitialDate)
  const isCustomGranularity = granularity === 'custom'

  function handleGranularityChange(e: SelectChangeEvent) {
    onGranularityChange(e.target.value as Granularity)
  }

  function handleCustomPeriodTypeSave(periodType: CustomPeriodType) {
    const updated = [...customPeriodTypes, periodType]
    setCustomPeriodTypes(updated)
    setSelectedPeriodId(periodType.id)
    onFromChange?.(periodType.from)
    onToChange?.(periodType.to)
    try {
      window.localStorage.setItem(
        PREFERENCE_KEYS.ACCOUNTING_CUSTOM_PERIOD_TYPES,
        JSON.stringify(updated),
      )
    } catch (error) {
      console.warn('Error saving custom period type:', error)
    }
  }

  function handleSelectCustomPeriodType(periodType: CustomPeriodType) {
    setSelectedPeriodId(periodType.id)
    onFromChange?.(periodType.from)
    onToChange?.(periodType.to)
  }

  function handleDeleteCustomPeriodType(id: string) {
    const updated = customPeriodTypes.filter((pt) => pt.id !== id)
    setCustomPeriodTypes(updated)
    try {
      window.localStorage.setItem(
        PREFERENCE_KEYS.ACCOUNTING_CUSTOM_PERIOD_TYPES,
        JSON.stringify(updated),
      )
    } catch (error) {
      console.warn('Error deleting custom period type:', error)
    }
    setMenuAnchorEl(null)
    setSelectedPeriodIdForDelete(null)
  }

  function handleOpenDeleteMenu(event: React.MouseEvent<HTMLElement>, periodId: string) {
    event.stopPropagation()
    setMenuAnchorEl(event.currentTarget)
    setSelectedPeriodIdForDelete(periodId)
  }

  function handleCloseDeleteMenu() {
    setMenuAnchorEl(null)
    setSelectedPeriodIdForDelete(null)
  }

  function handleConfirmDelete() {
    if (selectedPeriodIdForDelete) {
      handleDeleteCustomPeriodType(selectedPeriodIdForDelete)
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {!isCustomGranularity && (
          <>
            <IconButton
              onClick={onPrevPeriod}
              aria-label={t('accounting.period.prevPeriod')}
              size="small"
              disabled={isPrevDisabled}
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
          </>
        )}

        {isCustomGranularity && (
          <>
            <TextField
              label={t('accounting.period.customType.fromLabel')}
              type="date"
              value={from}
              onChange={(e) => onFromChange?.(e.target.value)}
              size="small"
              inputProps={{ 'data-testid': 'custom-period-from' }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('accounting.period.customType.toLabel')}
              type="date"
              value={to}
              onChange={(e) => onToChange?.(e.target.value)}
              size="small"
              inputProps={{ 'data-testid': 'custom-period-to' }}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              onClick={() => setShowSaveDialog(true)}
              variant="outlined"
              size="small"
              data-testid="save-custom-period-type-button"
            >
              {t('accounting.period.customType.saveButton')}
            </Button>
          </>
        )}

        <Select
          native={customPeriodTypes.length === 0}
          value={granularity}
          onChange={handleGranularityChange}
          size="small"
          sx={{ minWidth: 120 }}
          data-testid="granularity-selector"
        >
          <option value="" disabled>
            {t('accounting.period.selectGranularity')}
          </option>
          {GRANULARITIES.map((g) => (
            <option key={g} value={g}>
              {t(`accounting.period.${g}`)}
            </option>
          ))}
        </Select>

        {isCustomGranularity && customPeriodTypes.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Select
              value={selectedPeriodId}
              onChange={(e) => {
                const selectedId = e.target.value as string
                const periodType = customPeriodTypes.find((pt) => pt.id === selectedId)
                if (periodType) {
                  handleSelectCustomPeriodType(periodType)
                }
              }}
              size="small"
              sx={{ minWidth: 200, maxWidth: '100%' }}
              displayEmpty
              data-testid="custom-period-type-selector"
            >
              <MenuItem value="" disabled>
                {t('accounting.period.customType.selectSaved')}
              </MenuItem>
              {customPeriodTypes.map((pt) => (
                <MenuItem key={pt.id} value={pt.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{pt.name}</span>
                </MenuItem>
              ))}
            </Select>
            <IconButton
              size="small"
              onClick={(e) => handleOpenDeleteMenu(e, '')}
              title={t('accounting.period.customType.deleteButton')}
              data-testid="custom-period-delete-menu-trigger"
              aria-label="manage custom periods"
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleCloseDeleteMenu}
              data-testid="custom-period-delete-menu"
            >
              {customPeriodTypes.map((pt) => (
                <MenuItem
                  key={`menu-item-${pt.id}`}
                  onClick={() => {
                    setSelectedPeriodIdForDelete(pt.id)
                  }}
                  data-testid={`custom-period-menu-item-${pt.id}`}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 200 }}
                >
                  <span>{pt.name}</span>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCustomPeriodType(pt.id)
                    }}
                    data-testid={`delete-custom-period-${pt.id}`}
                    sx={{ ml: 2 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}
      </Box>

      <CustomPeriodTypeDialog
        open={showSaveDialog}
        from={from}
        to={to}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleCustomPeriodTypeSave}
        existingNames={customPeriodTypes.map((pt) => pt.name)}
      />
    </>
  )
}

import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { queryKeys } from '@/api/queryKeys'
import { useCurrencyView } from '@/hooks/useCurrencyView'

const ALL_IN_BASE = '__all_in_base__'

/**
 * Chooses the money the reports show (REQ-CUR-09): one currency, or the base-currency amounts of all of them.
 * Hidden while the workspace has only its base currency, since there is nothing to choose.
 */
export function CurrencyViewSelect({ workspaceId }: { workspaceId?: string | null }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { view, setView, baseCurrency, enabledCurrencies } = useCurrencyView(workspaceId)

  if (!baseCurrency || enabledCurrencies.length < 2) return null

  const value = view.inBase ? ALL_IN_BASE : (view.currency ?? baseCurrency)

  const handleChange = (next: string) => {
    if (next === ALL_IN_BASE) {
      setView({ currency: null, inBase: true })
    } else {
      setView({ currency: next === baseCurrency ? null : next, inBase: false })
    }
    // Every report answers in the currency view, so none of the cached ones is still right
    void qc.resetQueries({ queryKey: queryKeys.reports.all() })
  }

  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <InputLabel id="currency-view-label">{t('currency.view')}</InputLabel>
      <Select
        labelId="currency-view-label"
        label={t('currency.view')}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        inputProps={{ 'aria-label': t('currency.view') }}
      >
        {enabledCurrencies.map((code) => (
          <MenuItem key={code} value={code}>
            {code}
            {code === baseCurrency ? ` (${t('currency.base')})` : ''}
          </MenuItem>
        ))}
        <MenuItem value={ALL_IN_BASE}>{t('currency.allInBase', { currency: baseCurrency })}</MenuItem>
      </Select>
    </FormControl>
  )
}

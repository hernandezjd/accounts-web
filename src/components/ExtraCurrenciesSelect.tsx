import { useTranslation } from 'react-i18next'
import { useCurrencyView } from '@/hooks/useCurrencyView'
import { useCurrencyViewStore } from '@/store/currencyViewStore'
import { CurrencyMultiSelect } from './CurrencyMultiSelect'

/**
 * Chooses the currencies shown as extra columns next to the main one (MC-22).
 * Hidden while the workspace has only its base currency.
 */
export function ExtraCurrenciesSelect({ workspaceId }: { workspaceId?: string | null }) {
  const { t } = useTranslation()
  const { displayCurrency, enabledCurrencies } = useCurrencyView(workspaceId)
  const extra = useCurrencyViewStore((s) => s.extraCurrencies)
  const setExtra = useCurrencyViewStore((s) => s.setExtraCurrencies)

  const options = enabledCurrencies.filter((code) => code !== displayCurrency)
  if (options.length === 0) return null

  return (
    <CurrencyMultiSelect
      label={t('currency.extraColumns')}
      value={extra.filter((code) => options.includes(code))}
      onChange={setExtra}
      options={options}
      testId="extra-currencies-select"
      minWidth={220}
    />
  )
}

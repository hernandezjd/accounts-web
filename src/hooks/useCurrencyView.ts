import { useEffect } from 'react'
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useAppStore } from '@/store/appStore'
import { displayCurrencyOf, useCurrencyViewStore } from '@/store/currencyViewStore'

/**
 * The currency view of the selected workspace: which currency the reports show, the base currency and the
 * currencies the workspace has enabled. Keeps the store in step with the loaded workspace config, so
 * `formatAmount` and the request filter know the base currency.
 */
export function useCurrencyView(workspaceId?: string | null) {
  const selected = useAppStore((s) => s.selectedWorkspaceId)
  const id = workspaceId ?? selected
  const { data: config } = useWorkspaceConfig(id)
  const view = useCurrencyViewStore((s) => s.view)
  const setView = useCurrencyViewStore((s) => s.setView)
  const setBaseCurrency = useCurrencyViewStore((s) => s.setBaseCurrency)
  const baseCurrency = config?.baseCurrency ?? null
  const enabledCurrencies = config?.enabledCurrencies ?? []

  useEffect(() => {
    setBaseCurrency(baseCurrency)
  }, [baseCurrency, setBaseCurrency])

  return {
    view,
    setView,
    baseCurrency,
    enabledCurrencies,
    displayCurrency: displayCurrencyOf(view, baseCurrency),
  }
}

import { create } from 'zustand'

/**
 * Which money the reports show (MC-21, MC-28). The query service reads one currency at a time, and every currency
 * has complete movements of its own (derived equivalents included):
 * - `currency` null: the base currency of the workspace
 * - `currency` XXX: that currency, in XXX units
 */
export interface CurrencyView {
  currency: string | null
}

interface CurrencyViewState {
  view: CurrencyView
  /** The base currency of the selected workspace, once its config is loaded. */
  baseCurrency: string | null
  /** Currencies shown as extra columns next to the main one (MC-22). Never includes the main currency. */
  extraCurrencies: string[]
  setExtraCurrencies: (currencies: string[]) => void
  setView: (view: CurrencyView) => void
  setBaseCurrency: (baseCurrency: string | null) => void
}

export const useCurrencyViewStore = create<CurrencyViewState>()((set) => ({
  view: { currency: null },
  baseCurrency: null,
  extraCurrencies: [],
  setExtraCurrencies: (extraCurrencies) => set({ extraCurrencies }),
  setView: (view) => set({ view }),
  setBaseCurrency: (baseCurrency) => set({ baseCurrency }),
}))

/** The currency the amounts of the current view are in. */
export function displayCurrencyOf(view: CurrencyView, baseCurrency: string | null): string | null {
  return view.currency ?? baseCurrency
}

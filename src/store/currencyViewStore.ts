import { create } from 'zustand'

/**
 * Which money the reports show (REQ-CUR-09). The query service reads one currency at a time:
 * - `currency` null: the base currency of the workspace
 * - `currency` XXX: only what is in XXX, in XXX units
 * - `inBase`: the base-currency amounts of every currency added together, at the rates of each transaction
 */
export interface CurrencyView {
  currency: string | null
  inBase: boolean
}

interface CurrencyViewState {
  view: CurrencyView
  /** The base currency of the selected workspace, once its config is loaded. */
  baseCurrency: string | null
  setView: (view: CurrencyView) => void
  setBaseCurrency: (baseCurrency: string | null) => void
}

export const useCurrencyViewStore = create<CurrencyViewState>()((set) => ({
  view: { currency: null, inBase: false },
  baseCurrency: null,
  setView: (view) => set({ view }),
  setBaseCurrency: (baseCurrency) => set({ baseCurrency }),
}))

/** The currency the amounts of the current view are in. */
export function displayCurrencyOf(view: CurrencyView, baseCurrency: string | null): string | null {
  if (view.inBase) return baseCurrency
  return view.currency ?? baseCurrency
}

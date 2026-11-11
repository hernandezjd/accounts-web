import { displayCurrencyOf, useCurrencyViewStore } from '@/store/currencyViewStore'

const decimalsCache = new Map<string, number>()

/** Decimal places of an ISO 4217 currency (2 for USD, 0 for JPY, 3 for KWD). */
export function currencyDecimals(currency: string | null | undefined): number {
  if (!currency) return 2
  const cached = decimalsCache.get(currency)
  if (cached !== undefined) return cached
  let decimals = 2
  try {
    decimals =
      new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    // not a currency Intl knows: keep two decimals
  }
  decimalsCache.set(currency, decimals)
  return decimals
}

/**
 * Formats an amount with the decimals of its currency, without the symbol (it goes in table columns whose header
 * or row already names the currency). Pass `withCode` to append the code.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined,
  options: { withCode?: boolean; locale?: string } = {},
): string {
  if (amount == null) return '—'
  const decimals = currencyDecimals(currency)
  const text = amount.toLocaleString(options.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return options.withCode && currency ? `${text} ${currency}` : text
}

/** Formats an amount of the report view that is on screen (see currencyViewStore). */
export function formatAmount(n: number | null | undefined): string {
  const { view, baseCurrency } = useCurrencyViewStore.getState()
  return formatMoney(n, displayCurrencyOf(view, baseCurrency))
}

/**
 * Rates are stored as base units per one unit of the currency (MC-15). A rate below 1 (0.00043698 CAD per 1 COP) is
 * awkward to read and to type, so it is shown and entered the other way round (2,288.43 COP per 1 CAD).
 */
export function isInvertedRate(rate: number | null | undefined): boolean {
  return rate != null && rate > 0 && rate < 1
}

/** The stored rate for a number typed in the given direction. An inverted one is rounded to the 14 decimals of a rate. */
export function toStoredRate(typed: number, inverted: boolean): number {
  return inverted && typed > 0 ? Number((1 / typed).toFixed(14)) : typed
}

/** A stored rate as a sentence in its readable direction: "1 CAD = 2,288.43 COP" or "1 USD = 1.37 CAD". */
export function formatRate(rate: number, baseCurrency: string | null | undefined, currency: string, locale?: string): string {
  const inverted = isInvertedRate(rate)
  const value = (inverted ? 1 / rate : rate).toLocaleString(locale, { maximumSignificantDigits: 8 })
  const base = baseCurrency ?? ''
  return (inverted ? `1 ${base} = ${value} ${currency}` : `1 ${currency} = ${value} ${base}`).trim()
}

const FALLBACK_CURRENCIES = ['AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'EUR', 'GBP', 'JPY', 'MXN', 'PEN', 'USD']

/** The ISO 4217 codes the browser knows, sorted. */
export function allCurrencyCodes(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
    const codes = supported?.('currency')
    if (codes && codes.length > 0) return [...codes].sort()
  } catch {
    // older browsers: use the short list
  }
  return FALLBACK_CURRENCIES
}

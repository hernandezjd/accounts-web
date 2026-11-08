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

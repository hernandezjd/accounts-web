import { describe, it, expect, beforeEach } from 'vitest'
import { allCurrencyCodes, currencyDecimals, formatAmount, formatMoney, formatRate, isInvertedRate, toStoredRate } from './money'
import { useCurrencyViewStore } from '@/store/currencyViewStore'

describe('currencyDecimals', () => {
  it('uses the decimals of each currency', () => {
    expect(currencyDecimals('USD')).toBe(2)
    expect(currencyDecimals('JPY')).toBe(0)
    expect(currencyDecimals('KWD')).toBe(3)
  })

  it('falls back to two decimals when there is no currency', () => {
    expect(currencyDecimals(null)).toBe(2)
    expect(currencyDecimals('')).toBe(2)
  })
})

describe('formatMoney', () => {
  it('formats with the decimals of the currency', () => {
    expect(formatMoney(1234.5, 'USD', { locale: 'en' })).toBe('1,234.50')
    expect(formatMoney(1234.5, 'JPY', { locale: 'en' })).toBe('1,235')
    expect(formatMoney(1.5, 'KWD', { locale: 'en' })).toBe('1.500')
  })

  it('appends the code on request', () => {
    expect(formatMoney(10, 'EUR', { locale: 'en', withCode: true })).toBe('10.00 EUR')
  })

  it('shows a dash for a missing amount', () => {
    expect(formatMoney(null, 'USD')).toBe('—')
    expect(formatMoney(undefined, 'USD')).toBe('—')
  })
})

describe('formatAmount', () => {
  beforeEach(() => {
    useCurrencyViewStore.setState({ view: { currency: null }, baseCurrency: 'USD' })
  })

  it('formats in the base currency by default', () => {
    expect(formatAmount(5).endsWith('.00')).toBe(true)
  })

  it('formats in the currency of the view', () => {
    useCurrencyViewStore.setState({ view: { currency: 'JPY' } })
    expect(formatAmount(5)).toBe('5')
  })
})

describe('allCurrencyCodes', () => {
  it('lists ISO 4217 codes, USD among them', () => {
    expect(allCurrencyCodes()).toContain('USD')
  })
})

describe('rates in their readable direction', () => {
  it('inverts a rate below 1 only', () => {
    expect(isInvertedRate(0.00043698)).toBe(true)
    expect(isInvertedRate(1.37)).toBe(false)
    expect(isInvertedRate(1)).toBe(false)
    expect(isInvertedRate(0)).toBe(false)
    expect(isInvertedRate(undefined)).toBe(false)
  })

  it('stores a typed inverted rate as base units per one unit, with 14 decimals', () => {
    // 2,288.43 COP per 1 CAD = 1 / 2,288.43 CAD per 1 COP
    expect(toStoredRate(2288.43, true)).toBe(0.00043698081217)
    expect(toStoredRate(1.37, false)).toBe(1.37)
    expect(toStoredRate(0, true)).toBe(0)
  })

  it('formats a rate naming both currencies', () => {
    expect(formatRate(0.00043698081217, 'CAD', 'COP', 'en')).toBe('1 CAD = 2,288.43 COP')
    expect(formatRate(1.37, 'CAD', 'USD', 'en')).toBe('1 USD = 1.37 CAD')
  })
})

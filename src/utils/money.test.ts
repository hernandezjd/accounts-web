import { describe, it, expect, beforeEach } from 'vitest'
import { allCurrencyCodes, currencyDecimals, formatAmount, formatMoney } from './money'
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
    useCurrencyViewStore.setState({ view: { currency: null, inBase: false }, baseCurrency: 'USD' })
  })

  it('formats in the base currency by default', () => {
    expect(formatAmount(5).endsWith('.00')).toBe(true)
  })

  it('formats in the currency of the view', () => {
    useCurrencyViewStore.setState({ view: { currency: 'JPY', inBase: false } })
    expect(formatAmount(5)).toBe('5')
  })

  it('formats in the base currency when the view adds up everything in base', () => {
    useCurrencyViewStore.setState({ view: { currency: null, inBase: true }, baseCurrency: 'JPY' })
    expect(formatAmount(5)).toBe('5')
  })
})

describe('allCurrencyCodes', () => {
  it('lists ISO 4217 codes, USD among them', () => {
    expect(allCurrencyCodes()).toContain('USD')
  })
})

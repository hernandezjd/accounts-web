import { describe, it, expect } from 'vitest'
import { formatDate, formatCurrency, formatNumber } from './formatting'

describe('formatDate', () => {
  it('formats date with en locale', () => {
    const date = new Date(2024, 0, 15) // Jan 15, 2024
    const result = formatDate(date, 'en')
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2024/)
  })

  it('formats date with es locale', () => {
    const date = new Date(2024, 0, 15)
    const result = formatDate(date, 'es')
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/15/)
  })
})

describe('formatCurrency', () => {
  it('formats currency with en locale', () => {
    const result = formatCurrency(1234.56, 'en', 'USD')
    expect(result).toContain('1,234.56')
    expect(result).toContain('$')
  })

  it('formats currency with es locale', () => {
    const result = formatCurrency(1234.56, 'es', 'EUR')
    // Verify decimal comma and euro symbol (thousands grouping varies by environment)
    expect(result).toContain('34,56')
    expect(result).toContain('€')
  })
})

describe('formatNumber', () => {
  it('formats number with en locale', () => {
    const result = formatNumber(1234567, 'en')
    expect(result).toBe('1,234,567')
  })

  it('formats number with es locale', () => {
    const result = formatNumber(1234567, 'es')
    expect(result).toBe('1.234.567')
  })
})

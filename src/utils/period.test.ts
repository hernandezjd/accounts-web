import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDefaultPeriod,
  getNextPeriod,
  getPrevPeriod,
  getPeriodContaining,
  formatPeriodLabel,
  computeExpandedFromLevel,
} from './period'
import type { AccountPeriodNode } from '@/types/accounting'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  level: number,
  children: AccountPeriodNode[] = [],
): AccountPeriodNode {
  return {
    accountId: id,
    accountCode: id,
    accountName: id,
    level,
    openingBalance: 0,
    totalDebits: 0,
    totalCredits: 0,
    closingBalance: 0,
    children,
    thirdPartyChildren: [],
  }
}

// ─── getDefaultPeriod ────────────────────────────────────────────────────────

describe('getDefaultPeriod', () => {
  beforeEach(() => {
    // Freeze time to 2026-03-15
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns current month for monthly granularity', () => {
    const period = getDefaultPeriod('monthly')
    expect(period).toEqual({ from: '2026-03-01', to: '2026-03-31' })
  })

  it('returns current month when no granularity given', () => {
    const period = getDefaultPeriod()
    expect(period).toEqual({ from: '2026-03-01', to: '2026-03-31' })
  })
})

// ─── getNextPeriod ────────────────────────────────────────────────────────────

describe('getNextPeriod', () => {
  it('advances one month from January', () => {
    const result = getNextPeriod('2026-01-01', '2026-01-31', 'monthly')
    expect(result).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('advances one month across year boundary', () => {
    const result = getNextPeriod('2026-12-01', '2026-12-31', 'monthly')
    expect(result).toEqual({ from: '2027-01-01', to: '2027-01-31' })
  })

  it('advances one quarter from Q1', () => {
    const result = getNextPeriod('2026-01-01', '2026-03-31', 'quarterly')
    expect(result).toEqual({ from: '2026-04-01', to: '2026-06-30' })
  })

  it('advances one quarter from Q4 across year boundary', () => {
    const result = getNextPeriod('2026-10-01', '2026-12-31', 'quarterly')
    expect(result).toEqual({ from: '2027-01-01', to: '2027-03-31' })
  })

  it('advances one year', () => {
    const result = getNextPeriod('2026-01-01', '2026-12-31', 'yearly')
    expect(result).toEqual({ from: '2027-01-01', to: '2027-12-31' })
  })

  it('advances one week (Mon-Sun)', () => {
    // 2026-03-02 is a Monday, 2026-03-08 is a Sunday
    const result = getNextPeriod('2026-03-02', '2026-03-08', 'weekly')
    expect(result).toEqual({ from: '2026-03-09', to: '2026-03-15' })
  })

  it('advances custom by same duration (3-day window)', () => {
    const result = getNextPeriod('2026-03-01', '2026-03-03', 'custom')
    expect(result).toEqual({ from: '2026-03-04', to: '2026-03-06' })
  })

  it('advances custom by same duration (1-day window)', () => {
    const result = getNextPeriod('2026-03-15', '2026-03-15', 'custom')
    expect(result).toEqual({ from: '2026-03-16', to: '2026-03-16' })
  })
})

// ─── getPrevPeriod ────────────────────────────────────────────────────────────

describe('getPrevPeriod', () => {
  it('goes back one month from March', () => {
    const result = getPrevPeriod('2026-03-01', '2026-03-31', 'monthly')
    expect(result).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('goes back one month across year boundary', () => {
    const result = getPrevPeriod('2026-01-01', '2026-01-31', 'monthly')
    expect(result).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })

  it('goes back one quarter from Q2', () => {
    const result = getPrevPeriod('2026-04-01', '2026-06-30', 'quarterly')
    expect(result).toEqual({ from: '2026-01-01', to: '2026-03-31' })
  })

  it('goes back one year', () => {
    const result = getPrevPeriod('2026-01-01', '2026-12-31', 'yearly')
    expect(result).toEqual({ from: '2025-01-01', to: '2025-12-31' })
  })

  it('goes back one week', () => {
    const result = getPrevPeriod('2026-03-09', '2026-03-15', 'weekly')
    expect(result).toEqual({ from: '2026-03-02', to: '2026-03-08' })
  })

  it('goes back custom by same duration (3-day window)', () => {
    const result = getPrevPeriod('2026-03-04', '2026-03-06', 'custom')
    expect(result).toEqual({ from: '2026-03-01', to: '2026-03-03' })
  })
})

// ─── getPeriodContaining ─────────────────────────────────────────────────────

describe('getPeriodContaining', () => {
  it('returns month containing the date', () => {
    expect(getPeriodContaining('2026-03-15', 'monthly')).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
    })
  })

  it('returns February correctly (non-leap year)', () => {
    expect(getPeriodContaining('2026-02-15', 'monthly')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('returns Q1 for a date in January', () => {
    expect(getPeriodContaining('2026-01-15', 'quarterly')).toEqual({
      from: '2026-01-01',
      to: '2026-03-31',
    })
  })

  it('returns Q3 for a date in August', () => {
    expect(getPeriodContaining('2026-08-20', 'quarterly')).toEqual({
      from: '2026-07-01',
      to: '2026-09-30',
    })
  })

  it('returns full year for yearly granularity', () => {
    expect(getPeriodContaining('2026-06-15', 'yearly')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    })
  })

  it('returns Monday-Sunday week for weekly granularity', () => {
    // 2026-03-11 is a Wednesday
    expect(getPeriodContaining('2026-03-11', 'weekly')).toEqual({
      from: '2026-03-09',
      to: '2026-03-15',
    })
  })
})

// ─── formatPeriodLabel ────────────────────────────────────────────────────────

describe('formatPeriodLabel', () => {
  it('returns month name and year for monthly', () => {
    expect(formatPeriodLabel('2026-01-01', '2026-01-31', 'monthly', 'en')).toBe('January 2026')
  })

  it('returns Q1 format for quarterly Q1', () => {
    expect(formatPeriodLabel('2026-01-01', '2026-03-31', 'quarterly', 'en')).toBe('Q1 2026')
  })

  it('returns Q2 format for quarterly Q2', () => {
    expect(formatPeriodLabel('2026-04-01', '2026-06-30', 'quarterly', 'en')).toBe('Q2 2026')
  })

  it('returns Q3 for quarterly Q3', () => {
    expect(formatPeriodLabel('2026-07-01', '2026-09-30', 'quarterly', 'en')).toBe('Q3 2026')
  })

  it('returns Q4 for quarterly Q4', () => {
    expect(formatPeriodLabel('2026-10-01', '2026-12-31', 'quarterly', 'en')).toBe('Q4 2026')
  })

  it('returns year only for yearly', () => {
    expect(formatPeriodLabel('2026-01-01', '2026-12-31', 'yearly', 'en')).toBe('2026')
  })

  it('returns date range for weekly', () => {
    const label = formatPeriodLabel('2026-03-02', '2026-03-08', 'weekly', 'en')
    expect(label).toMatch(/Mar/)
    expect(label).toMatch(/2026/)
  })

  it('returns date range for custom', () => {
    const label = formatPeriodLabel('2026-03-01', '2026-03-15', 'custom', 'en')
    expect(label).toMatch(/Mar/)
  })
})

// ─── computeExpandedFromLevel ─────────────────────────────────────────────────

describe('computeExpandedFromLevel', () => {
  // Tree structure:
  // A (level 1)
  //   B (level 2)
  //     C (level 3)
  //   D (level 2, leaf)
  // E (level 1, leaf)
  const treeC = makeNode('C', 3)
  const treeD = makeNode('D', 2)
  const treeB = makeNode('B', 2, [treeC])
  const treeE = makeNode('E', 1)
  const treeA = makeNode('A', 1, [treeB, treeD])
  const nodes = [treeA, treeE]

  it('null levelFilter → expands all nodes with children', () => {
    const expanded = computeExpandedFromLevel(nodes, null)
    expect(expanded.has('A')).toBe(true)
    expect(expanded.has('B')).toBe(true)
    expect(expanded.has('C')).toBe(false) // leaf
    expect(expanded.has('D')).toBe(false) // leaf
    expect(expanded.has('E')).toBe(false) // leaf
  })

  it('levelFilter=1 → empty set (level < 1 means nothing)', () => {
    const expanded = computeExpandedFromLevel(nodes, 1)
    expect(expanded.size).toBe(0)
  })

  it('levelFilter=2 → only level-1 nodes with children expanded', () => {
    const expanded = computeExpandedFromLevel(nodes, 2)
    expect(expanded.has('A')).toBe(true)  // level 1 < 2, has children
    expect(expanded.has('B')).toBe(false) // level 2 is not < 2
    expect(expanded.has('E')).toBe(false) // leaf
  })

  it('levelFilter=3 → level-1 and level-2 nodes with children expanded', () => {
    const expanded = computeExpandedFromLevel(nodes, 3)
    expect(expanded.has('A')).toBe(true) // level 1 < 3, has children
    expect(expanded.has('B')).toBe(true) // level 2 < 3, has children
    expect(expanded.has('D')).toBe(false) // leaf
    expect(expanded.has('C')).toBe(false) // leaf
  })

  it('empty nodes → empty set', () => {
    expect(computeExpandedFromLevel([], null).size).toBe(0)
  })
})

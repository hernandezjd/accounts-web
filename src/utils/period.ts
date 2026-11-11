import type { AccountPeriodNode, Granularity, Period } from '@/types/accounting'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse a YYYY-MM-DD string as a local date (avoids UTC offset issues). */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Last day of the given month (1-based). */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ─── Quarter helpers ──────────────────────────────────────────────────────────

function quarterStartMonth(month: number): number {
  return Math.floor((month - 1) / 3) * 3 + 1
}

function quarterNumber(month: number): number {
  return Math.ceil(month / 3)
}

// ─── Week helpers (ISO Monday-based) ─────────────────────────────────────────

function isoMonday(d: Date): Date {
  const day = d.getDay() // 0=Sun,1=Mon,...,6=Sat
  const diff = day === 0 ? -6 : 1 - day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
}

function isoSunday(d: Date): Date {
  const monday = isoMonday(d)
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getDefaultPeriod(granularity: Granularity = 'monthly'): Period {
  return getPeriodContaining(toDateStr(new Date()), granularity)
}

export function getPeriodContaining(dateStr: string, granularity: Granularity): Period {
  const d = parseLocalDate(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth() + 1 // 1-based

  switch (granularity) {
    case 'monthly':
      return {
        from: `${year}-${pad(month)}-01`,
        to: `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`,
      }

    case 'quarterly': {
      const qStart = quarterStartMonth(month)
      const qEnd = qStart + 2
      return {
        from: `${year}-${pad(qStart)}-01`,
        to: `${year}-${pad(qEnd)}-${pad(lastDayOfMonth(year, qEnd))}`,
      }
    }

    case 'yearly':
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      }

    case 'weekly': {
      const mon = isoMonday(d)
      const sun = isoSunday(d)
      return { from: toDateStr(mon), to: toDateStr(sun) }
    }

    case 'custom':
      // For getPeriodContaining with custom, return just the single day
      return { from: dateStr, to: dateStr }
  }
}

export function getNextPeriod(from: string, _to: string, granularity: Granularity): Period {
  const d = parseLocalDate(from)
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  switch (granularity) {
    case 'monthly': {
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      return {
        from: `${nextYear}-${pad(nextMonth)}-01`,
        to: `${nextYear}-${pad(nextMonth)}-${pad(lastDayOfMonth(nextYear, nextMonth))}`,
      }
    }

    case 'quarterly': {
      const qStart = quarterStartMonth(month)
      const nextQStart = qStart + 3 > 12 ? qStart + 3 - 12 : qStart + 3
      const nextQYear = qStart + 3 > 12 ? year + 1 : year
      const nextQEnd = nextQStart + 2
      return {
        from: `${nextQYear}-${pad(nextQStart)}-01`,
        to: `${nextQYear}-${pad(nextQEnd)}-${pad(lastDayOfMonth(nextQYear, nextQEnd))}`,
      }
    }

    case 'yearly':
      return {
        from: `${year + 1}-01-01`,
        to: `${year + 1}-12-31`,
      }

    case 'weekly': {
      const nextMon = new Date(year, d.getMonth(), d.getDate() + 7)
      const nextSun = new Date(nextMon.getFullYear(), nextMon.getMonth(), nextMon.getDate() + 6)
      return { from: toDateStr(nextMon), to: toDateStr(nextSun) }
    }

    case 'custom': {
      const fromD = parseLocalDate(from)
      const toD = parseLocalDate(_to)
      const diffDays =
        Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1
      const newFrom = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate() + diffDays)
      const newTo = new Date(newFrom.getFullYear(), newFrom.getMonth(), newFrom.getDate() + diffDays - 1)
      return { from: toDateStr(newFrom), to: toDateStr(newTo) }
    }
  }
}

export function getPrevPeriod(from: string, _to: string, granularity: Granularity): Period {
  const d = parseLocalDate(from)
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  switch (granularity) {
    case 'monthly': {
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      return {
        from: `${prevYear}-${pad(prevMonth)}-01`,
        to: `${prevYear}-${pad(prevMonth)}-${pad(lastDayOfMonth(prevYear, prevMonth))}`,
      }
    }

    case 'quarterly': {
      const qStart = quarterStartMonth(month)
      const prevQStart = qStart - 3 <= 0 ? qStart - 3 + 12 : qStart - 3
      const prevQYear = qStart - 3 <= 0 ? year - 1 : year
      const prevQEnd = prevQStart + 2
      return {
        from: `${prevQYear}-${pad(prevQStart)}-01`,
        to: `${prevQYear}-${pad(prevQEnd)}-${pad(lastDayOfMonth(prevQYear, prevQEnd))}`,
      }
    }

    case 'yearly':
      return {
        from: `${year - 1}-01-01`,
        to: `${year - 1}-12-31`,
      }

    case 'weekly': {
      const prevMon = new Date(year, d.getMonth(), d.getDate() - 7)
      const prevSun = new Date(prevMon.getFullYear(), prevMon.getMonth(), prevMon.getDate() + 6)
      return { from: toDateStr(prevMon), to: toDateStr(prevSun) }
    }

    case 'custom': {
      const fromD = parseLocalDate(from)
      const toD = parseLocalDate(_to)
      const diffDays =
        Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1
      const newTo = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate() - 1)
      const newFrom = new Date(newTo.getFullYear(), newTo.getMonth(), newTo.getDate() - diffDays + 1)
      return { from: toDateStr(newFrom), to: toDateStr(newTo) }
    }
  }
}

export function formatPeriodLabel(
  from: string,
  _to: string,
  granularity: Granularity,
  locale: string,
): string {
  const d = parseLocalDate(from)
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  switch (granularity) {
    case 'monthly': {
      const formatted = d.toLocaleString(locale, { month: 'long', year: 'numeric' })
      // Capitalize first letter for consistency
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }

    case 'quarterly': {
      const q = quarterNumber(month)
      return `Q${q} ${year}`
    }

    case 'yearly':
      return String(year)

    case 'weekly':
    case 'custom': {
      const fromD = parseLocalDate(from)
      const toD = parseLocalDate(_to)
      const fromStr = fromD.toLocaleString(locale, { month: 'short', day: 'numeric' })
      const toStr = toD.toLocaleString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
      return `${fromStr} – ${toStr}`
    }
  }
}

// ─── computeExpandedFromLevel ─────────────────────────────────────────────────

function collectExpandable(nodes: AccountPeriodNode[], levelFilter: number | null, result: Set<string>): void {
  for (const node of nodes) {
    const hasChildren = node.children.length > 0 || node.thirdPartyChildren.length > 0
    if (hasChildren) {
      if (levelFilter === null || node.level < levelFilter) {
        result.add(node.accountId)
      }
    }
    if (node.children.length > 0) {
      collectExpandable(node.children, levelFilter, result)
    }
  }
}

/**
 * Returns the Set of accountIds whose children should be visible.
 * - levelFilter=null → expand all nodes that have children
 * - levelFilter=N → expand nodes where node.level < N
 */
export function computeExpandedFromLevel(
  nodes: AccountPeriodNode[],
  levelFilter: number | null,
): Set<string> {
  const result = new Set<string>()
  collectExpandable(nodes, levelFilter, result)
  return result
}

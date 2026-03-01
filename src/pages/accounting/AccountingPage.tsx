import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import type { AccountPeriodNode, Granularity } from '@/types/accounting'
import {
  computeExpandedFromLevel,
  getDefaultPeriod,
  getPeriodContaining,
  getNextPeriod,
  getPrevPeriod,
} from '@/utils/period'
import { usePeriodAccountSummary } from '@/hooks/api/usePeriodAccountSummary'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { PeriodControls } from './PeriodControls'
import { AccountTree } from './AccountTree'

function parseLevel(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

export function AccountingPage() {
  const { t } = useTranslation()
  const { tenantId } = useParams<{ tenantId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Period state (URL is source of truth) ─────────────────────────────────
  const granularity = (searchParams.get('granularity') as Granularity) ?? 'monthly'
  const defaultPeriod = getDefaultPeriod(granularity)

  const from = searchParams.get('from') ?? defaultPeriod.from
  const to = searchParams.get('to') ?? defaultPeriod.to
  const levelFilter = parseLevel(searchParams.get('level'))

  // Ensure URL has the default period if not set
  useEffect(() => {
    if (!searchParams.get('from') || !searchParams.get('to')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (!next.get('from')) next.set('from', defaultPeriod.from)
          if (!next.get('to')) next.set('to', defaultPeriod.to)
          if (!next.get('granularity')) next.set('granularity', 'monthly')
          return next
        },
        { replace: true },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Expand state (React state, reset when data changes) ───────────────────
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = usePeriodAccountSummary(tenantId, from, to)

  // Reset expanded nodes when data or level filter changes
  useEffect(() => {
    const nodes: AccountPeriodNode[] = data?.accounts ?? []
    setExpandedNodes(computeExpandedFromLevel(nodes, levelFilter))
  }, [data, levelFilter])

  // ── URL update helpers ────────────────────────────────────────────────────
  function setPeriod(nextFrom: string, nextTo: string, nextGranularity: Granularity) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('from', nextFrom)
      next.set('to', nextTo)
      next.set('granularity', nextGranularity)
      return next
    })
  }

  function handlePrevPeriod() {
    const prev = getPrevPeriod(from, to, granularity)
    setPeriod(prev.from, prev.to, granularity)
  }

  function handleNextPeriod() {
    const next = getNextPeriod(from, to, granularity)
    setPeriod(next.from, next.to, granularity)
  }

  function handleGranularityChange(g: Granularity) {
    const newPeriod = getPeriodContaining(from, g)
    setPeriod(newPeriod.from, newPeriod.to, g)
  }

  function handleLevelFilterChange(level: number | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (level === null) {
        next.delete('level')
      } else {
        next.set('level', String(level))
      }
      return next
    })
  }

  // ── Expand/collapse callbacks ─────────────────────────────────────────────
  const handleToggle = useCallback((accountId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }, [])

  const handleExpandAll = useCallback(() => {
    const nodes: AccountPeriodNode[] = data?.accounts ?? []
    setExpandedNodes(computeExpandedFromLevel(nodes, null))
  }, [data])

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const stablePrevPeriod = useCallback(handlePrevPeriod, [from, to, granularity])
  const stableNextPeriod = useCallback(handleNextPeriod, [from, to, granularity])

  useKeyboardShortcut('ArrowLeft', t('accounting.shortcuts.prevPeriod'), stablePrevPeriod)
  useKeyboardShortcut('ArrowRight', t('accounting.shortcuts.nextPeriod'), stableNextPeriod)
  useKeyboardShortcut(
    '+',
    t('accounting.shortcuts.levelUp'),
    useCallback(() => {
      handleLevelFilterChange(levelFilter === null ? 5 : Math.min(levelFilter + 1, 5))
    }, [levelFilter]),
  )
  useKeyboardShortcut(
    '-',
    t('accounting.shortcuts.levelDown'),
    useCallback(() => {
      handleLevelFilterChange(levelFilter === null ? 4 : Math.max(levelFilter - 1, 1))
    }, [levelFilter]),
  )
  useKeyboardShortcut('e', t('accounting.shortcuts.expandAll'), handleExpandAll)
  useKeyboardShortcut('c', t('accounting.shortcuts.collapseAll'), handleCollapseAll)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('accounting.title')}
      </Typography>

      <PeriodControls
        from={from}
        to={to}
        granularity={granularity}
        onPrevPeriod={handlePrevPeriod}
        onNextPeriod={handleNextPeriod}
        onGranularityChange={handleGranularityChange}
      />

      <Box sx={{ mt: 2 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
            <CircularProgress size={24} />
            <Typography color="text.secondary">{t('accounting.loading')}</Typography>
          </Box>
        )}

        {isError && (
          <Typography color="error">{t('accounting.error')}</Typography>
        )}

        {data && !isLoading && (
          <AccountTree
            nodes={data.accounts}
            expandedNodes={expandedNodes}
            levelFilter={levelFilter}
            onToggle={handleToggle}
            onLevelFilterChange={handleLevelFilterChange}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
          />
        )}
      </Box>
    </Box>
  )
}

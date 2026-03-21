import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { formatError } from '@/lib/error/useErrorHandler'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { useTranslation } from 'react-i18next'
import type { AccountPeriodNode, Granularity } from '@/types/accounting'
import {
  computeExpandedFromLevel,
  getDefaultPeriod,
  getPeriodContaining,
  getNextPeriod,
  getPrevPeriod,
} from '@/utils/period'
import { PREFERENCE_KEYS } from '@/utils/preferences'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { usePeriodAccountSummary } from '@/hooks/api/usePeriodAccountSummary'
import { useTenantConfig } from '@/hooks/api/useTenantConfig'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { PeriodControls } from './PeriodControls'
import { AccountTree } from './AccountTree'
import { SearchBar, type SearchBarHandle } from './SearchBar'
import { TransactionView } from './TransactionView'

function parseLevel(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

interface ViewStateSnapshot {
  from: string
  to: string
  granularity: Granularity
  levelFilter: number | null
  expandedNodes: Set<string>
  scrollPosition: number
}

/** Walk the account tree to find a node by accountId. */
function findAccount(
  nodes: AccountPeriodNode[],
  accountId: string,
): AccountPeriodNode | undefined {
  for (const node of nodes) {
    if (node.accountId === accountId) return node
    const found = findAccount(node.children, accountId)
    if (found) return found
  }
  return undefined
}

/** Walk the tree and collect IDs of all ancestors of the target node. */
function collectAncestorIds(
  nodes: AccountPeriodNode[],
  targetId: string,
  acc: Set<string> = new Set(),
): boolean {
  for (const node of nodes) {
    if (node.accountId === targetId) return true
    if (collectAncestorIds(node.children, targetId, acc)) {
      acc.add(node.accountId)
      return true
    }
  }
  return false
}

export function AccountingPage() {
  const { t } = useTranslation()
  const { tenantId } = useParams<{ tenantId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── UI Preferences persistence (localStorage) ──────────────────────────────
  const [storedLevel, setStoredLevel] = useLocalStorage<number | null>(PREFERENCE_KEYS.ACCOUNTING_LEVEL, null)
  const [storedGranularity, setStoredGranularity] = useLocalStorage<Granularity>(
    PREFERENCE_KEYS.ACCOUNTING_GRANULARITY,
    'monthly',
  )
  const [storedPeriodFrom, setStoredPeriodFrom] = useLocalStorage<string | null>(
    PREFERENCE_KEYS.ACCOUNTING_PERIOD_FROM,
    null,
  )
  const [storedPeriodTo, setStoredPeriodTo] = useLocalStorage<string | null>(PREFERENCE_KEYS.ACCOUNTING_PERIOD_TO, null)
  const [storedSimulateClosure, setStoredSimulateClosure] = useLocalStorage<boolean>(
    PREFERENCE_KEYS.ACCOUNTING_SIMULATE_CLOSURE,
    false,
  )

  // ── Period state (URL is source of truth) ─────────────────────────────────
  const granularity = (searchParams.get('granularity') as Granularity) ?? storedGranularity ?? 'monthly'
  const defaultPeriod = getDefaultPeriod(granularity)

  const from = searchParams.get('from') ?? storedPeriodFrom ?? defaultPeriod.from
  const to = searchParams.get('to') ?? storedPeriodTo ?? defaultPeriod.to
  const levelFilter = parseLevel(searchParams.get('level'))

  // ── View mode (URL) ───────────────────────────────────────────────────────
  const viewMode = searchParams.get('view') === 'transactions' ? 'transactions' : 'tree'
  const selectedAccountId = searchParams.get('accountId') ?? null
  const selectedThirdPartyId = searchParams.get('thirdPartyId') ?? null

  // ── View state stack (React state, independent from browser history) ───────
  const [, setViewStateStack] = useState<ViewStateSnapshot[]>([])

  // ── Highlight state for search account selection ───────────────────────────
  const [highlightedAccountId, setHighlightedAccountId] = useState<string | null>(null)

  // ── Closure simulation toggle with localStorage persistence ───────────────
  const [simulateClosure, setSimulateClosureState] = useState(() => storedSimulateClosure)
  const [showMissingConfigWarning, setShowMissingConfigWarning] = useState(false)

  const setSimulateClosure = (value: boolean | ((prev: boolean) => boolean)) => {
    setSimulateClosureState((prev) => {
      const next = value instanceof Function ? value(prev) : value
      setStoredSimulateClosure(next)
      return next
    })
  }

  // Ref to trigger scroll restoration after tree re-renders
  const pendingScrollRef = useRef<number | null>(null)

  // ── Ensure URL has the period if not set (use stored values if available) ────
  useEffect(() => {
    if (!searchParams.get('from') || !searchParams.get('to')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          // Use stored period if available, otherwise use defaults
          if (!next.get('from')) next.set('from', storedPeriodFrom || defaultPeriod.from)
          if (!next.get('to')) next.set('to', storedPeriodTo || defaultPeriod.to)
          if (!next.get('granularity')) next.set('granularity', storedGranularity || 'monthly')
          return next
        },
        { replace: true },
      )
    }
    if (!searchParams.get('level') && storedLevel !== null) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('level', String(storedLevel))
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
  const { data: tenantConfig, isLoading: isConfigLoading } = useTenantConfig(tenantId)
  const systemInitialDate = tenantConfig?.systemInitialDate

  // Clamp `from` so we never request data before systemInitialDate.
  // This matters when systemInitialDate falls mid-period (e.g. initial=Apr 8,
  // period=Apr 1–30: we send Apr 8–30 to the backend instead of Apr 1–30).
  const effectiveFrom =
    systemInitialDate && from < systemInitialDate ? systemInitialDate : from

  const { data, isLoading, isError, error: apiError, refetch } = usePeriodAccountSummary(tenantId, effectiveFrom, to, simulateClosure)

  // Format error for display with classification
  const formattedError = apiError ? formatError(apiError, (apiError as any)?.status) : null

  // ── Snap period forward if it ends before systemInitialDate ──────────────
  // Use `to < systemInitialDate` (not `from`) so a yearly period that straddles
  // the initial date (e.g. 2026-01-01–2026-12-31 with initial=2026-04-01) is
  // kept as-is. Only entirely-before periods (March 2026, Q1 2026, etc.) snap.
  useEffect(() => {
    if (systemInitialDate && to < systemInitialDate) {
      const adjusted = getPeriodContaining(systemInitialDate, granularity)
      setPeriod(adjusted.from, adjusted.to, granularity)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemInitialDate, to, granularity])

  // ── Search bar ref (for "/" shortcut) ─────────────────────────────────────
  const searchBarRef = useRef<SearchBarHandle>(null)

  // Reset expanded nodes when data or level filter changes (tree view only)
  useEffect(() => {
    if (viewMode === 'tree') {
      const nodes: AccountPeriodNode[] = data?.accounts ?? []
      setExpandedNodes(computeExpandedFromLevel(nodes, levelFilter))
    }
  }, [data, levelFilter, viewMode])

  // Scroll restoration after returning to tree view
  useEffect(() => {
    if (viewMode === 'tree' && pendingScrollRef.current !== null) {
      const pos = pendingScrollRef.current
      pendingScrollRef.current = null
      // Small delay to let the tree render before scrolling
      requestAnimationFrame(() => {
        window.scrollTo(0, pos)
      })
    }
  }, [viewMode])

  // ── URL update helpers ────────────────────────────────────────────────────
  function setPeriod(nextFrom: string, nextTo: string, nextGranularity: Granularity) {
    // Update URL (source of truth)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('from', nextFrom)
      next.set('to', nextTo)
      next.set('granularity', nextGranularity)
      return next
    })
    // Persist to localStorage for next visit
    setStoredPeriodFrom(nextFrom)
    setStoredPeriodTo(nextTo)
    setStoredGranularity(nextGranularity)
  }

  function handlePrevPeriod() {
    if (systemInitialDate && from <= systemInitialDate) {
      // Already at or before initial date, don't navigate further back
      return
    }
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

  function handleFromChange(nextFrom: string) {
    setPeriod(nextFrom, to, granularity)
  }

  function handleToChange(nextTo: string) {
    setPeriod(from, nextTo, granularity)
  }

  function handleLevelFilterChange(level: number | null) {
    // Update URL (source of truth)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (level === null) {
        next.delete('level')
      } else {
        next.set('level', String(level))
      }
      return next
    })
    // Persist to localStorage for next visit
    setStoredLevel(level)
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

  // ── Drill-down and back ───────────────────────────────────────────────────
  const handleDrillDown = useCallback(
    (accountId: string, thirdPartyId?: string) => {
      // Capture current state before navigating
      const snapshot: ViewStateSnapshot = {
        from,
        to,
        granularity,
        levelFilter,
        expandedNodes: new Set(expandedNodes),
        scrollPosition: window.scrollY,
      }
      setViewStateStack((prev) => [...prev, snapshot])
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('view', 'transactions')
        next.set('accountId', accountId)
        if (thirdPartyId) {
          next.set('thirdPartyId', thirdPartyId)
        } else {
          next.delete('thirdPartyId')
        }
        return next
      })
    },
    [from, to, granularity, levelFilter, expandedNodes, setSearchParams],
  )

  const handleBack = useCallback(() => {
    setViewStateStack((prev) => {
      if (prev.length === 0) return prev
      const snapshot = prev[prev.length - 1]
      const rest = prev.slice(0, -1)

      // Restore expand state
      setExpandedNodes(new Set(snapshot.expandedNodes))
      pendingScrollRef.current = snapshot.scrollPosition

      // Restore URL
      setSearchParams(() => {
        const next = new URLSearchParams()
        next.set('from', snapshot.from)
        next.set('to', snapshot.to)
        next.set('granularity', snapshot.granularity)
        if (snapshot.levelFilter !== null) {
          next.set('level', String(snapshot.levelFilter))
        }
        // Remove view, accountId, thirdPartyId
        return next
      })

      return rest
    })
  }, [setSearchParams])

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleAccountSelect = useCallback(
    (accountId: string) => {
      const ancestors = new Set<string>()
      collectAncestorIds(data?.accounts ?? [], accountId, ancestors)
      setExpandedNodes((prev) => new Set([...prev, ...ancestors, accountId]))
      setHighlightedAccountId(accountId)
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-account-id="${accountId}"]`)
          ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      })
      setTimeout(() => setHighlightedAccountId(null), 2000)
    },
    [data],
  )

  const handleTransactionSelect = useCallback(
    (transactionId: string, accountId: string, date: string) => {
      const txDate = new Date(date)
      const txFrom = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-01`
      const txTo = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0).toISOString().slice(0, 10)
      void transactionId
      setSearchParams(() => {
        const p = new URLSearchParams()
        p.set('view', 'transactions')
        p.set('accountId', accountId)
        p.set('from', txFrom)
        p.set('to', txTo)
        p.set('granularity', 'monthly')
        return p
      })
    },
    [setSearchParams],
  )

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
  // Escape = back (only relevant in transaction view; harmless in tree view)
  useKeyboardShortcut('Escape', t('accounting.shortcuts.back'), handleBack)
  // "/" = focus search bar (tree view only; ref will be null in transaction view)
  useKeyboardShortcut(
    '/',
    t('accounting.shortcuts.focusSearch'),
    useCallback(() => searchBarRef.current?.focus(), []),
  )

  // ── Resolve account/TP display names from loaded data ────────────────────
  const selectedAccount = selectedAccountId
    ? findAccount(data?.accounts ?? [], selectedAccountId)
    : null
  const selectedTP = selectedAccount?.thirdPartyChildren.find(
    (tp) => tp.thirdPartyId === selectedThirdPartyId,
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('accounting.title')}
      </Typography>

      {viewMode === 'transactions' && selectedAccountId ? (
        <TransactionView
          tenantId={tenantId ?? ''}
          accountId={selectedAccountId}
          accountName={selectedAccount?.accountName ?? selectedAccountId}
          accountCode={selectedAccount?.accountCode ?? ''}
          thirdPartyId={selectedThirdPartyId ?? undefined}
          thirdPartyName={selectedTP?.thirdPartyName}
          from={from}
          to={to}
          granularity={granularity}
          onBack={handleBack}
          onPrevPeriod={handlePrevPeriod}
          onNextPeriod={handleNextPeriod}
          onGranularityChange={handleGranularityChange}
        />
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PeriodControls
              from={from}
              to={to}
              granularity={granularity}
              onPrevPeriod={handlePrevPeriod}
              onNextPeriod={handleNextPeriod}
              onGranularityChange={handleGranularityChange}
              onFromChange={handleFromChange}
              onToChange={handleToChange}
              systemInitialDate={systemInitialDate}
            />
            <FormControlLabel
              sx={{ ml: 'auto' }}
              control={
                <Switch
                  checked={simulateClosure}
                  onChange={(e) => {
                    const wantOn = e.target.checked
                    if (wantOn) {
                      const hasNominal = tenantConfig?.nominalAccounts && tenantConfig.nominalAccounts.length > 0
                      const hasPnl = !!tenantConfig?.profitLossAccountId
                      if (!hasNominal || !hasPnl) {
                        setShowMissingConfigWarning(true)
                        return
                      }
                    }
                    setShowMissingConfigWarning(false)
                    setSimulateClosure(wantOn)
                  }}
                  data-testid="simulate-closure-toggle"
                />
              }
              label={t('accounting.simulateClosureToggle')}
            />
          </Box>

          {simulateClosure && (
            <Alert severity="info" sx={{ mb: 2 }} data-testid="simulation-active-banner">
              {t('accounting.closureSimulationInfo')}
            </Alert>
          )}

          {showMissingConfigWarning && !simulateClosure && (() => {
            const hasNominal = tenantConfig?.nominalAccounts && tenantConfig.nominalAccounts.length > 0
            const hasPnl = !!tenantConfig?.profitLossAccountId
            const messageKey = !hasNominal && !hasPnl
              ? 'accounting.closureMissingBoth'
              : !hasNominal
                ? 'accounting.closureMissingNominal'
                : 'accounting.closureMissingPnl'
            return (
              <Alert severity="warning" sx={{ mb: 2 }} data-testid="simulation-missing-config-banner">
                {t(messageKey)}{' '}
                <Link to="../setup" state={{ initialTab: 1, initialEditMode: 'nominalAccounts' }} data-testid="missing-config-link">
                  {t('accounting.closureMissingConfigLink')}
                </Link>
              </Alert>
            )
          })()}

          <SearchBar
            ref={searchBarRef}
            tenantId={tenantId ?? ''}
            from={from}
            to={to}
            onAccountSelect={handleAccountSelect}
            onTransactionSelect={handleTransactionSelect}
          />

          <Box sx={{ mt: 2 }}>
            {isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">{t('accounting.loading')}</Typography>
              </Box>
            )}

            {isError && !isConfigLoading && !(systemInitialDate && to < systemInitialDate) && (
              <ErrorMessage error={formattedError} onRetry={() => void refetch()} />
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
                onDrillDown={handleDrillDown}
                highlightedAccountId={highlightedAccountId ?? undefined}
                simulateClosure={simulateClosure}
                from={effectiveFrom}
                to={to}
              />
            )}
          </Box>
        </>
      )}
    </Box>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorMessage } from '@/components/error/ErrorMessage'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
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
import { useWorkspaceConfig } from '@/hooks/api/useWorkspaceConfig'
import { useWorkspaceConfigMutations } from '@/hooks/api/useWorkspaceConfigMutations'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { PeriodControls } from './PeriodControls'
import { AccountTree } from './AccountTree'
import { SearchBar, type SearchBarHandle } from './SearchBar'
import { TransactionList } from './TransactionList'
import { useAccounts } from '@/hooks/api/useAccounts'
import { CurrencyViewSelect } from '@/components/CurrencyViewSelect'
import { ExtraCurrenciesSelect } from '@/components/ExtraCurrenciesSelect'
import { useExtraCurrencySummaries } from '@/hooks/api/useExtraCurrencySummaries'
import { useCurrencyView } from '@/hooks/useCurrencyView'
import { loadTreeState, saveTreeState } from '@/utils/accountingTreeState'
import { useCurrencyViewStore } from '@/store/currencyViewStore'

function parseLevel(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

type ViewMode = 'tree' | 'transactions'

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
  const { workspaceId } = useParams<{ workspaceId: string }>()
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

  // ── Tab (URL) ─────────────────────────────────────────────────────────────
  // Two tabs share the period and the currencies: the account tree and the transactions.
  // The transactions tab shows one account's statement when an account is chosen, else all transactions.
  const viewMode: ViewMode = searchParams.get('view') === 'transactions' ? 'transactions' : 'tree'
  const selectedAccountId = searchParams.get('accountId') ?? null
  const selectedThirdPartyId = searchParams.get('thirdPartyId') ?? null

  // ── Highlight state for search account selection ───────────────────────────
  const [highlightedAccountId, setHighlightedAccountId] = useState<string | null>(null)

  // ── Ref to track current period values (avoid stale closures in callbacks) ──
  const periodRef = useRef({ from, to, granularity })
  useEffect(() => {
    periodRef.current = { from, to, granularity }
  }, [from, to, granularity])

  // ── Closure simulation toggle with localStorage persistence ───────────────
  const [simulateClosure, setSimulateClosureState] = useState(() => storedSimulateClosure)
  const [showMissingConfigWarning, setShowMissingConfigWarning] = useState(false)
  // Zero-balance rows are hidden by default; this switch asks the backend for them.
  const [showZeroAccounts, setShowZeroAccounts] = useState(false)

  const setSimulateClosure = (value: boolean | ((prev: boolean) => boolean)) => {
    setSimulateClosureState((prev) => {
      const next = value instanceof Function ? value(prev) : value
      setStoredSimulateClosure(next)
      return next
    })
  }

  // Scroll position of the tree when the user left it, restored when they come back
  const treeScrollRef = useRef<number | null>(null)

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
  // Restored from the session so leaving the page and coming back keeps the open levels.
  const savedTreeState = useRef(loadTreeState(workspaceId))
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set(savedTreeState.current?.expanded ?? []),
  )

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: workspaceConfig, isLoading: isConfigLoading } = useWorkspaceConfig(workspaceId)
  const { setAlwaysVisibleAccounts } = useWorkspaceConfigMutations(workspaceId ?? '')
  const alwaysVisibleIds = useMemo(
    () => new Set(workspaceConfig?.alwaysVisibleAccountIds ?? []),
    [workspaceConfig?.alwaysVisibleAccountIds],
  )
  const handleToggleAlwaysVisible = (accountId: string, next: boolean) => {
    const current = workspaceConfig?.alwaysVisibleAccountIds ?? []
    const accountIds = next ? [...current, accountId] : current.filter((id) => id !== accountId)
    setAlwaysVisibleAccounts.mutate(accountIds)
  }
  const systemInitialDate = workspaceConfig?.systemInitialDate

  // Clamp `from` so we never request data before systemInitialDate.
  // This matters when systemInitialDate falls mid-period (e.g. initial=Apr 8,
  // period=Apr 1–30: we send Apr 8–30 to the backend instead of Apr 1–30).
  const effectiveFrom =
    systemInitialDate && from < systemInitialDate ? systemInitialDate : from

  const { data, isLoading, isError, error: apiError, refetch } = usePeriodAccountSummary(workspaceId, effectiveFrom, to, simulateClosure, showZeroAccounts)

  // Format error for display with classification
  const formattedError = apiError ?? null

  // Extra currency columns: one more request per chosen currency (MC-22)
  const { displayCurrency, enabledCurrencies } = useCurrencyView(workspaceId)
  const chosenExtra = useCurrencyViewStore((s) => s.extraCurrencies)
  const extraCurrencies = chosenExtra.filter((c) => c !== displayCurrency && enabledCurrencies.includes(c))
  const extraColumns = useExtraCurrencySummaries(workspaceId, effectiveFrom, to, extraCurrencies, simulateClosure)

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

  // Expansion follows the level filter, not the data. A refetch (currency change,
  // zero-account toggle, closure simulation) or a round trip to the transactions
  // view must keep what the user opened or closed by hand.
  // - First data, or a new level filter: reset to the level default.
  // - Later data: only expand parents not seen before (e.g. revealed zero accounts).
  const seenExpandableRef = useRef<Set<string> | null>(
    savedTreeState.current ? new Set(savedTreeState.current.seen) : null,
  )
  const appliedLevelRef = useRef<number | null | undefined>(savedTreeState.current?.level)
  useEffect(() => {
    if (!data) return
    const defaults = computeExpandedFromLevel(data.accounts, levelFilter)
    const levelChanged = appliedLevelRef.current !== levelFilter
    const firstLoad = seenExpandableRef.current === null
    if (firstLoad || levelChanged) {
      setExpandedNodes(defaults)
    } else {
      const seen = seenExpandableRef.current as Set<string>
      const fresh = [...defaults].filter((id) => !seen.has(id))
      if (fresh.length > 0) {
        setExpandedNodes((prev) => new Set([...prev, ...fresh]))
      }
    }
    appliedLevelRef.current = levelFilter
    seenExpandableRef.current = computeExpandedFromLevel(data.accounts, null)
  }, [data, levelFilter])

  // Remember the expansion for the next visit (only once the tree has been initialised).
  useEffect(() => {
    if (seenExpandableRef.current === null) return
    saveTreeState(workspaceId, {
      expanded: [...expandedNodes],
      level: appliedLevelRef.current ?? null,
      seen: [...seenExpandableRef.current],
    })
  }, [expandedNodes, workspaceId])

  // Coming back to the tree: same scroll position as when the user left, and the account
  // they were looking at is opened and highlighted for a moment.
  const previousViewRef = useRef<ViewMode>(viewMode)
  const treeNodesRef = useRef<AccountPeriodNode[]>([])
  useEffect(() => {
    treeNodesRef.current = data?.accounts ?? []
  }, [data])
  useEffect(() => {
    const cameBack = previousViewRef.current === 'transactions' && viewMode === 'tree'
    previousViewRef.current = viewMode
    if (!cameBack) return
    const scrollPosition = treeScrollRef.current
    treeScrollRef.current = null
    const accountId = selectedAccountId
    // Wait a frame so the tree is rendered before scrolling
    requestAnimationFrame(() => {
      if (scrollPosition !== null) window.scrollTo(0, scrollPosition)
      if (!accountId) return
      const ancestors = new Set<string>()
      collectAncestorIds(treeNodesRef.current, accountId, ancestors)
      setExpandedNodes((prev) => new Set([...prev, ...ancestors]))
      setHighlightedAccountId(accountId)
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-account-id="${accountId}"]`)
          ?.scrollIntoView?.({ block: 'nearest' })
      })
      setTimeout(() => setHighlightedAccountId(null), 2000)
    })
  }, [viewMode, selectedAccountId])

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
    // Read current values from ref to avoid stale closures when both callbacks fire in quick succession
    const { to: currentTo, granularity: currentGranularity } = periodRef.current
    setPeriod(nextFrom, currentTo, currentGranularity)
  }

  function handleToChange(nextTo: string) {
    // Read current values from ref to avoid stale closures when both callbacks fire in quick succession
    const { from: currentFrom, granularity: currentGranularity } = periodRef.current
    setPeriod(currentFrom, nextTo, currentGranularity)
  }

  function handlePeriodChange(nextFrom: string, nextTo: string) {
    // Single atomic update for both dates (used when selecting saved custom periods)
    const { granularity: currentGranularity } = periodRef.current
    setPeriod(nextFrom, nextTo, currentGranularity)
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

  // ── Moving between the two tabs ───────────────────────────────────────────
  /** Open the transactions tab, on one account's statement or (accountId null) on all transactions. */
  const showTransactions = useCallback(
    (accountId: string | null, thirdPartyId?: string) => {
      if (viewMode === 'tree') treeScrollRef.current = window.scrollY
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('view', 'transactions')
        if (accountId) {
          next.set('accountId', accountId)
        } else {
          next.delete('accountId')
        }
        if (accountId && thirdPartyId) {
          next.set('thirdPartyId', thirdPartyId)
        } else {
          next.delete('thirdPartyId')
        }
        return next
      })
    },
    [viewMode, setSearchParams],
  )

  const handleDrillDown = useCallback(
    (accountId: string, thirdPartyId?: string) => showTransactions(accountId, thirdPartyId),
    [showTransactions],
  )

  /** Back to the account tree. The chosen account stays in the URL, so the tree can highlight it. */
  const handleBack = useCallback(() => {
    setSearchParams((prev) => {
      if (prev.get('view') !== 'transactions') return prev
      const next = new URLSearchParams(prev)
      next.delete('view')
      return next
    })
  }, [setSearchParams])

  const handleTabChange = (tab: ViewMode) => {
    if (tab === viewMode) return
    if (tab === 'tree') {
      handleBack()
    } else {
      showTransactions(selectedAccountId, selectedThirdPartyId ?? undefined)
    }
  }

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
      treeScrollRef.current = window.scrollY
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
  // The handlers close over the current period and level, so keep the latest ones
  // in a ref and give the shortcuts stable callbacks that always call the latest.
  const latestHandlers = useRef({ handlePrevPeriod, handleNextPeriod, handleLevelFilterChange, levelFilter })
  useEffect(() => {
    latestHandlers.current = { handlePrevPeriod, handleNextPeriod, handleLevelFilterChange, levelFilter }
  })
  const stablePrevPeriod = useCallback(() => latestHandlers.current.handlePrevPeriod(), [])
  const stableNextPeriod = useCallback(() => latestHandlers.current.handleNextPeriod(), [])
  const stableLevelUp = useCallback(() => {
    const { levelFilter: level, handleLevelFilterChange: change } = latestHandlers.current
    change(level === null ? 5 : Math.min(level + 1, 5))
  }, [])
  const stableLevelDown = useCallback(() => {
    const { levelFilter: level, handleLevelFilterChange: change } = latestHandlers.current
    change(level === null ? 4 : Math.max(level - 1, 1))
  }, [])

  useKeyboardShortcut('ArrowLeft', t('accounting.shortcuts.prevPeriod'), stablePrevPeriod)
  useKeyboardShortcut('ArrowRight', t('accounting.shortcuts.nextPeriod'), stableNextPeriod)
  useKeyboardShortcut('+', t('accounting.shortcuts.levelUp'), stableLevelUp)
  useKeyboardShortcut('-', t('accounting.shortcuts.levelDown'), stableLevelDown)
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
  // An account without movements in the period is not in the tree: take its name from the account list
  const needsAccountLookup = viewMode === 'transactions' && !!selectedAccountId && !!data && !selectedAccount
  const { data: allAccounts } = useAccounts(needsAccountLookup ? workspaceId : null)
  const listedAccount = needsAccountLookup ? allAccounts?.find((a) => a.id === selectedAccountId) : undefined
  const selectedAccountCode = selectedAccount?.accountCode ?? listedAccount?.code ?? ''
  const selectedAccountName = selectedAccount?.accountName ?? listedAccount?.name ?? (selectedAccountCode ? '' : '…')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('accounting.title')}
      </Typography>

      {/* Shared header: the period and the currencies apply to both tabs */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 1 }}>
        <PeriodControls
          from={from}
          to={to}
          granularity={granularity}
          onPrevPeriod={handlePrevPeriod}
          onNextPeriod={handleNextPeriod}
          onGranularityChange={handleGranularityChange}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          onPeriodChange={handlePeriodChange}
          systemInitialDate={systemInitialDate}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
          <CurrencyViewSelect workspaceId={workspaceId} />
          <ExtraCurrenciesSelect workspaceId={workspaceId} />
        </Box>
      </Box>

      <Tabs
        value={viewMode}
        onChange={(_, tab: ViewMode) => handleTabChange(tab)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="tree" label={t('accounting.tabs.accounts')} data-testid="tab-accounts" />
        <Tab value="transactions" label={t('accounting.tabs.transactions')} data-testid="tab-transactions" />
      </Tabs>

      {viewMode === 'transactions' ? (
        <TransactionList
          workspaceId={workspaceId ?? ''}
          // The statement of an account takes the period as chosen; the full list never starts before the initial date
          from={selectedAccountId ? from : effectiveFrom}
          to={to}
          accountId={selectedAccountId ?? undefined}
          accountName={selectedAccountName}
          accountCode={selectedAccountCode}
          thirdPartyId={selectedThirdPartyId ?? undefined}
          thirdPartyName={selectedTP?.thirdPartyName}
          onClearAccount={() => showTransactions(null)}
          onAccountSelect={(accountId) => showTransactions(accountId)}
        />
      ) : (
        <>
          {/* Options that only make sense for the account tree */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <FormControlLabel
              sx={{ mx: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8rem', color: 'text.secondary' } }}
              control={
                <Switch
                  size="small"
                  checked={showZeroAccounts}
                  onChange={(e) => setShowZeroAccounts(e.target.checked)}
                  data-testid="show-zero-accounts-toggle"
                />
              }
              label={t('accounting.showZeroAccounts')}
            />
            <FormControlLabel
              sx={{ mx: 0, '& .MuiFormControlLabel-label': { fontSize: '0.8rem', color: 'text.secondary' } }}
              control={
                <Switch
                  size="small"
                  checked={simulateClosure}
                  onChange={(e) => {
                    const wantOn = e.target.checked
                    if (wantOn) {
                      const hasNominal = workspaceConfig?.nominalAccounts && workspaceConfig.nominalAccounts.length > 0
                      const hasPnl = !!workspaceConfig?.profitLossAccountId
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
          </Box>

          {simulateClosure && (
            <Alert severity="info" sx={{ mb: 2 }} data-testid="simulation-active-banner">
              {t('accounting.closureSimulationInfo')}
            </Alert>
          )}

          {showMissingConfigWarning && !simulateClosure && (() => {
            const hasNominal = workspaceConfig?.nominalAccounts && workspaceConfig.nominalAccounts.length > 0
            const hasPnl = !!workspaceConfig?.profitLossAccountId
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
            workspaceId={workspaceId ?? ''}
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
                alwaysVisibleIds={alwaysVisibleIds}
                onToggleAlwaysVisible={handleToggleAlwaysVisible}
                extraColumns={extraColumns}
              />
            )}
          </Box>
        </>
      )}
    </Box>
  )
}

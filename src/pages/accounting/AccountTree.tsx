import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import type { AccountPeriodNode } from '@/types/accounting'
import { AccountTreeRow } from './AccountTreeRow'
import type { ReactNode } from 'react'

const LEVEL_OPTIONS = [1, 2, 3, 4, 5]

interface AccountTreeProps {
  nodes: AccountPeriodNode[]
  expandedNodes: Set<string>
  levelFilter: number | null
  onToggle: (accountId: string) => void
  onLevelFilterChange: (level: number | null) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onDrillDown: (accountId: string, thirdPartyId?: string) => void
  highlightedAccountId?: string
  simulateClosure?: boolean
  from: string
  to: string
}

/**
 * Get the first day of the calendar period (e.g., 2026-01-01 for any date in January 2026).
 * This is derived from the `from` date's year and month (YYYY-MM-DD format).
 */
function getFirstDayOfPeriod(from: string): string {
  // Extract year and month from the from string (format: YYYY-MM-DD)
  const [year, month] = from.split('-')
  return `${year}-${month}-01`
}

/**
 * Get the opening balance header content with date clarification if needed.
 * If the opening balance date (from) differs from the first day of the period,
 * show the date on a second line to prevent layout shift.
 */
function getOpeningBalanceHeader(from: string, simulateClosure: boolean, t: any): ReactNode {
  const firstDay = getFirstDayOfPeriod(from)
  const baseKey = simulateClosure ? 'accounting.tree.openingBalanceSim' : 'accounting.tree.openingBalance'
  const baseLabel = t(baseKey)

  // If opening balance date is not the first day of the period, show date on separate line
  if (from !== firstDay) {
    const asOf = t('accounting.tree.openingBalanceAsOf')
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, gap: 0.25 }}>
        <div>{baseLabel}</div>
        <div style={{ fontSize: '0.875em' }}>
          ({asOf} {from})
        </div>
      </Box>
    )
  }
  return baseLabel
}

export function AccountTree({
  nodes,
  expandedNodes,
  levelFilter,
  onToggle,
  onLevelFilterChange,
  onExpandAll,
  onCollapseAll,
  onDrillDown,
  highlightedAccountId,
  simulateClosure,
  from,
}: AccountTreeProps) {
  const { t } = useTranslation()

  return (
    <Box>
      {/* Level filter + expand/collapse toolbar */}
      <Toolbar disableGutters variant="dense" sx={{ gap: 2, flexWrap: 'wrap', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('accounting.tree.levelFilter')}:
          </Typography>
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => onLevelFilterChange(null)}
              variant={levelFilter === null ? 'contained' : 'outlined'}
              aria-label={t('accounting.tree.allLevels')}
            >
              {t('accounting.tree.allLevels')}
            </Button>
            {LEVEL_OPTIONS.map((lvl) => (
              <Button
                key={lvl}
                onClick={() => onLevelFilterChange(lvl)}
                variant={levelFilter === lvl ? 'contained' : 'outlined'}
                aria-label={String(lvl)}
              >
                {lvl}
              </Button>
            ))}
          </ButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={onExpandAll}>
            {t('accounting.tree.expandAll')}
          </Button>
          <Button size="small" variant="outlined" onClick={onCollapseAll}>
            {t('accounting.tree.collapseAll')}
          </Button>
        </Box>
      </Toolbar>

      {/* Account tree table */}
      <Box sx={{ overflowX: 'auto' }}>
      <TableContainer>
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ height: 80 }}>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>{t('accounting.tree.code')}</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 300 }}>{t('accounting.tree.name')}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 120, display: { xs: 'none', sm: 'table-cell' } }}>
                {getOpeningBalanceHeader(from, simulateClosure ?? false, t)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 120, display: { xs: 'none', sm: 'table-cell' } }}>
                {t('accounting.tree.debits')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 120, display: { xs: 'none', sm: 'table-cell' } }}>
                {t('accounting.tree.credits')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 120 }}>
                {simulateClosure ? t('accounting.tree.closingBalanceSim') : t('accounting.tree.closingBalance')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {nodes.map((node) => (
              <AccountTreeRow
                key={node.accountId}
                node={node}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onDrillDown={onDrillDown}
                highlightedAccountId={highlightedAccountId}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>
    </Box>
  )
}

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
      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('accounting.tree.code')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('accounting.tree.name')}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {t('accounting.tree.openingBalance')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {t('accounting.tree.debits')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {t('accounting.tree.credits')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {t('accounting.tree.closingBalance')}
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
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

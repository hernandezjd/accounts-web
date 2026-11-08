import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import type { AccountPeriodNode, ThirdPartyPeriodNode } from '@/types/accounting'

const INDENT_PX = 24
// Size of the small IconButton (20px icon + 2px padding per side).
const TOGGLE_SLOT_PX = 24
// Accounts at these levels are always shown and cannot be configured as always visible.
const ALWAYS_VISIBLE_MAX_LEVEL = 2

interface AccountTreeRowProps {
  node: AccountPeriodNode
  expandedNodes: Set<string>
  onToggle: (accountId: string) => void
  onDrillDown: (accountId: string, thirdPartyId?: string) => void
  highlightedAccountId?: string
  /** Account ids configured to stay visible even when all their values are zero. */
  alwaysVisibleIds?: ReadonlySet<string>
  /** Called with the next state when the pin control is clicked. Omit to hide the control. */
  onToggleAlwaysVisible?: (accountId: string, next: boolean) => void
}

function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Returns 'primary.main' if the value was changed by closure simulation. */
function simColor(current: number, original: number | undefined): string | undefined {
  return original !== undefined && current !== original ? 'primary.main' : undefined
}

function ThirdPartyRow({
  tp,
  accountId,
  indent,
  onDrillDown,
}: {
  tp: ThirdPartyPeriodNode
  accountId: string
  indent: number
  onDrillDown: (accountId: string, thirdPartyId?: string) => void
}) {
  function handleActivate() {
    onDrillDown(accountId, tp.thirdPartyId)
  }

  return (
    <TableRow
      hover
      sx={{ opacity: 0.9, cursor: 'pointer' }}
      tabIndex={0}
      onDoubleClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleActivate()
      }}
      aria-label={`${tp.thirdPartyExternalId} ${tp.thirdPartyName}`}
    >
      <TableCell sx={{ pl: `${indent}px`, py: 0.5 }}>
        {/* Same toggle slot as account rows, so the code lines up with the codes of child accounts */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: TOGGLE_SLOT_PX, flexShrink: 0 }} />
          <Box component="span" sx={{ fontStyle: 'italic', fontSize: '0.85em', color: 'text.secondary' }}>
            {tp.thirdPartyExternalId}
          </Box>
        </Box>
      </TableCell>
      <TableCell sx={{ py: 0.5 }}>
        <Box component="span" sx={{ fontStyle: 'italic', fontSize: '0.85em', color: 'text.secondary' }}>
          {tp.thirdPartyName}
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.85em', color: simColor(tp.openingBalance, tp.originalOpeningBalance) ?? 'text.secondary' }}>
        {formatAmount(tp.openingBalance)}
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.85em', color: simColor(tp.totalDebits, tp.originalTotalDebits) ?? 'text.secondary' }}>
        {formatAmount(tp.totalDebits)}
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.85em', color: simColor(tp.totalCredits, tp.originalTotalCredits) ?? 'text.secondary' }}>
        {formatAmount(tp.totalCredits)}
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.85em', color: simColor(tp.closingBalance, tp.originalClosingBalance) ?? 'text.secondary' }}>
        {formatAmount(tp.closingBalance)}
      </TableCell>
    </TableRow>
  )
}

export function AccountTreeRow({
  node,
  expandedNodes,
  onToggle,
  onDrillDown,
  highlightedAccountId,
  alwaysVisibleIds,
  onToggleAlwaysVisible,
}: AccountTreeRowProps) {
  const { t } = useTranslation()
  const indent = (node.level - 1) * INDENT_PX
  const hasChildren = node.children.length > 0 || node.thirdPartyChildren.length > 0
  const isExpanded = expandedNodes.has(node.accountId)
  const isHighlighted = highlightedAccountId === node.accountId
  const isAlwaysVisible = alwaysVisibleIds?.has(node.accountId) ?? false
  const canConfigureAlwaysVisible = node.level > ALWAYS_VISIBLE_MAX_LEVEL && onToggleAlwaysVisible !== undefined
  const pinLabel = t('accounting.tree.alwaysVisible')
  const viewTransactionsLabel = t('accounting.tree.viewTransactions')

  function handleActivate() {
    onDrillDown(node.accountId)
  }

  return (
    <>
      <TableRow
        hover
        data-account-id={node.accountId}
        sx={{
          cursor: 'pointer',
          bgcolor: isHighlighted ? 'primary.light' : undefined,
          transition: 'background-color 1.5s',
        }}
        tabIndex={0}
        onDoubleClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleActivate()
        }}
        aria-label={`${node.accountCode} ${node.accountName}`}
      >
        <TableCell sx={{ pl: `${indent}px`, py: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Fixed-width toggle slot so codes align whether or not the row has children */}
            <Box sx={{ width: TOGGLE_SLOT_PX, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle(node.accountId)
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  aria-label={`toggle ${node.accountCode}`}
                  sx={{ p: 0.25 }}
                >
                  {isExpanded ? (
                    <ExpandMoreIcon fontSize="small" />
                  ) : (
                    <ChevronRightIcon fontSize="small" />
                  )}
                </IconButton>
              )}
            </Box>
            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.875em' }}>
              {node.accountCode}
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ py: 0.75, fontWeight: node.level === 1 ? 600 : 400 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
            <span>{node.accountName}</span>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {canConfigureAlwaysVisible && (
                <Tooltip title={pinLabel}>
                <IconButton
                  size="small"
                  aria-label={pinLabel}
                  aria-pressed={isAlwaysVisible}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleAlwaysVisible(node.accountId, !isAlwaysVisible)
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  sx={{
                    p: 0.25,
                    color: isAlwaysVisible ? 'primary.main' : 'text.disabled',
                    opacity: isAlwaysVisible ? 1 : 0.35,
                    '&:hover': { opacity: 1 },
                  }}
                >
                  {isAlwaysVisible ? (
                    <PushPinIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <PushPinOutlinedIcon sx={{ fontSize: 14 }} />
                  )}
                </IconButton>
              </Tooltip>
              )}
              <Tooltip title={viewTransactionsLabel}>
                <IconButton
                  size="small"
                  aria-label={viewTransactionsLabel}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleActivate()
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  sx={{ p: 0.25, color: 'text.secondary', opacity: 0.6, '&:hover': { opacity: 1 } }}
                >
                  <ReceiptLongOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75, color: simColor(node.openingBalance, node.originalOpeningBalance) }}>
          {formatAmount(node.openingBalance)}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75, color: simColor(node.totalDebits, node.originalTotalDebits) }}>
          {formatAmount(node.totalDebits)}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75, color: simColor(node.totalCredits, node.originalTotalCredits) }}>
          {formatAmount(node.totalCredits)}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75, color: simColor(node.closingBalance, node.originalClosingBalance) }}>
          {formatAmount(node.closingBalance)}
        </TableCell>
      </TableRow>

      {isExpanded && (
        <>
          {node.thirdPartyChildren.map((tp) => (
            <ThirdPartyRow
              key={tp.thirdPartyId}
              tp={tp}
              accountId={node.accountId}
              indent={indent + INDENT_PX}
              onDrillDown={onDrillDown}
            />
          ))}
          {node.children.map((child) => (
            <AccountTreeRow
              key={child.accountId}
              node={child}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onDrillDown={onDrillDown}
              highlightedAccountId={highlightedAccountId}
              alwaysVisibleIds={alwaysVisibleIds}
              onToggleAlwaysVisible={onToggleAlwaysVisible}
            />
          ))}
        </>
      )}
    </>
  )
}

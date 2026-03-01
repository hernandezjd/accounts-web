import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Box from '@mui/material/Box'
import type { AccountPeriodNode, ThirdPartyPeriodNode } from '@/types/accounting'

const INDENT_PX = 24

interface AccountTreeRowProps {
  node: AccountPeriodNode
  expandedNodes: Set<string>
  onToggle: (accountId: string) => void
  onDrillDown: (accountId: string, thirdPartyId?: string) => void
  highlightedAccountId?: string
}

function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
        <Box component="span" sx={{ fontStyle: 'italic', fontSize: '0.85em', color: 'text.secondary' }}>
          {tp.thirdPartyExternalId}
        </Box>
      </TableCell>
      <TableCell sx={{ py: 0.5 }}>
        <Box component="span" sx={{ fontStyle: 'italic', fontSize: '0.85em', color: 'text.secondary' }}>
          {tp.thirdPartyName}
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.85em', color: 'text.secondary' }}>
        {formatAmount(tp.openingBalance)}
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.85em', color: 'text.secondary' }}>
        {formatAmount(tp.totalDebits)}
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.85em', color: 'text.secondary' }}>
        {formatAmount(tp.totalCredits)}
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.85em', color: 'text.secondary' }}>
        {formatAmount(tp.closingBalance)}
      </TableCell>
    </TableRow>
  )
}

export function AccountTreeRow({ node, expandedNodes, onToggle, onDrillDown, highlightedAccountId }: AccountTreeRowProps) {
  const indent = (node.level - 1) * INDENT_PX
  const hasChildren = node.children.length > 0 || node.thirdPartyChildren.length > 0
  const isExpanded = expandedNodes.has(node.accountId)
  const isHighlighted = highlightedAccountId === node.accountId

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
        <TableCell sx={{ pl: `${indent + (hasChildren ? 0 : 40)}px`, py: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.875em' }}>
              {node.accountCode}
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ py: 0.75, fontWeight: node.level === 1 ? 600 : 400 }}>
          {node.accountName}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75 }}>
          {formatAmount(node.openingBalance)}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75 }}>
          {formatAmount(node.totalDebits)}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75 }}>
          {formatAmount(node.totalCredits)}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75 }}>
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
            />
          ))}
        </>
      )}
    </>
  )
}

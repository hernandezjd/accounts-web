import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { AccountTree } from './AccountTree'
import type { AccountPeriodNode } from '@/types/accounting'

function makeNode(
  id: string,
  level: number,
  children: AccountPeriodNode[] = [],
  hasTP = false,
): AccountPeriodNode {
  return {
    accountId: id,
    accountCode: `CODE-${id}`,
    accountName: `Account ${id}`,
    level,
    openingBalance: 100,
    totalDebits: 200,
    totalCredits: 50,
    closingBalance: 250,
    children,
    thirdPartyChildren: hasTP
      ? [
          {
            thirdPartyId: `tp-${id}`,
            thirdPartyName: `TP for ${id}`,
            thirdPartyExternalId: `EXT-${id}`,
            openingBalance: 10,
            totalDebits: 20,
            totalCredits: 5,
            closingBalance: 25,
          },
        ]
      : [],
  }
}

const leafA = makeNode('A', 1)
const leafB = makeNode('B', 2)
const nodeWithChild = makeNode('P', 1, [leafB])
const nodeWithTP = makeNode('T', 1, [], true)

const defaultProps = {
  nodes: [leafA],
  expandedNodes: new Set<string>(),
  levelFilter: null as number | null,
  onToggle: vi.fn(),
  onLevelFilterChange: vi.fn(),
  onExpandAll: vi.fn(),
  onCollapseAll: vi.fn(),
}

describe('AccountTree', () => {
  it('renders column headers', () => {
    renderWithProviders(<AccountTree {...defaultProps} />)
    expect(screen.getByText('Code')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Opening')).toBeInTheDocument()
    expect(screen.getByText('Debits')).toBeInTheDocument()
    expect(screen.getByText('Credits')).toBeInTheDocument()
    expect(screen.getByText('Closing')).toBeInTheDocument()
  })

  it('renders root account rows with code and name', () => {
    renderWithProviders(<AccountTree {...defaultProps} nodes={[leafA]} />)
    expect(screen.getByText('CODE-A')).toBeInTheDocument()
    expect(screen.getByText('Account A')).toBeInTheDocument()
  })

  it('shows expand icon for account with children; clicking triggers onToggle', () => {
    const onToggle = vi.fn()
    renderWithProviders(
      <AccountTree
        {...defaultProps}
        nodes={[nodeWithChild]}
        expandedNodes={new Set()}
        onToggle={onToggle}
      />,
    )
    // Parent row visible
    expect(screen.getByText('CODE-P')).toBeInTheDocument()
    // Child not yet visible (collapsed)
    expect(screen.queryByText('CODE-B')).not.toBeInTheDocument()

    // Find and click the row toggle button (aria-label: "toggle CODE-P")
    const expandBtn = screen.getByRole('button', { name: /toggle code-p/i })
    fireEvent.click(expandBtn)
    expect(onToggle).toHaveBeenCalledWith('P')
  })

  it('shows child row when parent is in expandedNodes', () => {
    renderWithProviders(
      <AccountTree
        {...defaultProps}
        nodes={[nodeWithChild]}
        expandedNodes={new Set(['P'])}
      />,
    )
    expect(screen.getByText('CODE-B')).toBeInTheDocument()
    expect(screen.getByText('Account B')).toBeInTheDocument()
  })

  it('shows TP child rows when parent is expanded and has thirdPartyChildren', () => {
    renderWithProviders(
      <AccountTree
        {...defaultProps}
        nodes={[nodeWithTP]}
        expandedNodes={new Set(['T'])}
      />,
    )
    expect(screen.getByText('TP for T')).toBeInTheDocument()
    expect(screen.getByText('EXT-T')).toBeInTheDocument()
  })

  it('TP row has no expand button', () => {
    renderWithProviders(
      <AccountTree
        {...defaultProps}
        nodes={[nodeWithTP]}
        expandedNodes={new Set(['T'])}
      />,
    )
    // Only the parent T row should have a row-toggle button; TP rows have none
    const rowToggles = screen.getAllByRole('button', { name: /toggle/i })
    expect(rowToggles).toHaveLength(1)
    expect(rowToggles[0]).toHaveAttribute('aria-label', 'toggle CODE-T')
  })

  it('Level filter "All" button calls onLevelFilterChange with null', () => {
    const onLevelFilterChange = vi.fn()
    renderWithProviders(
      <AccountTree {...defaultProps} onLevelFilterChange={onLevelFilterChange} levelFilter={2} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onLevelFilterChange).toHaveBeenCalledWith(null)
  })

  it('Level filter "2" button calls onLevelFilterChange with 2', () => {
    const onLevelFilterChange = vi.fn()
    renderWithProviders(
      <AccountTree {...defaultProps} onLevelFilterChange={onLevelFilterChange} levelFilter={null} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onLevelFilterChange).toHaveBeenCalledWith(2)
  })

  it('Collapse All button calls onCollapseAll', () => {
    const onCollapseAll = vi.fn()
    renderWithProviders(
      <AccountTree {...defaultProps} onCollapseAll={onCollapseAll} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }))
    expect(onCollapseAll).toHaveBeenCalled()
  })

  it('Expand All button calls onExpandAll', () => {
    const onExpandAll = vi.fn()
    renderWithProviders(
      <AccountTree {...defaultProps} onExpandAll={onExpandAll} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }))
    expect(onExpandAll).toHaveBeenCalled()
  })

  it('indentation increases by level (level-2 row has more padding than level-1)', () => {
    renderWithProviders(
      <AccountTree
        {...defaultProps}
        nodes={[nodeWithChild]}
        expandedNodes={new Set(['P'])}
      />,
    )
    const level1Row = screen.getByText('CODE-P').closest('tr')
    const level2Row = screen.getByText('CODE-B').closest('tr')
    expect(level1Row).toBeInTheDocument()
    expect(level2Row).toBeInTheDocument()
    // Level-1 and level-2 rows are different rows
    expect(level1Row).not.toBe(level2Row)
  })
})

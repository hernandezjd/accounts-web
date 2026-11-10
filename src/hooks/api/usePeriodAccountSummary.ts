import { keepPreviousData } from '@tanstack/react-query'
import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { AccountPeriodNode, PeriodAccountSummary } from '@/types/accounting'

/**
 * Convert a closure response node back to AccountPeriodNode format.
 * Uses simulated balances when available, and preserves originals for UI diffing.
 */
interface ClosureBalances {
  openingBalance?: number
  totalDebits?: number
  totalCredits?: number
  closingBalance?: number
}

interface ClosureThirdPartyNode {
  thirdPartyId: string
  thirdPartyName: string
  thirdPartyExternalId: string
  original?: ClosureBalances
  simulated?: ClosureBalances
}

interface ClosureNode {
  accountId: string
  accountCode: string
  accountName: string
  level: number
  original?: ClosureBalances
  simulated?: ClosureBalances
  children?: ClosureNode[]
  thirdPartyChildren?: ClosureThirdPartyNode[]
}

/** Either a plain period node or a closure node carrying `original`/`simulated`. */
type SummaryNode = AccountPeriodNode | ClosureNode

function convertClosureNode(node: ClosureNode): AccountPeriodNode {
  const original = node.original ?? {}
  const simulated = node.simulated ?? {}

  return {
    accountId: node.accountId,
    accountCode: node.accountCode,
    accountName: node.accountName,
    level: node.level,
    // Use simulated balances if available, otherwise use original
    openingBalance: simulated.openingBalance ?? original.openingBalance ?? 0,
    totalDebits: simulated.totalDebits ?? original.totalDebits ?? 0,
    totalCredits: simulated.totalCredits ?? original.totalCredits ?? 0,
    closingBalance: simulated.closingBalance ?? original.closingBalance ?? 0,
    // Preserve originals so the UI can diff and highlight faked values
    originalOpeningBalance: original.openingBalance ?? 0,
    originalTotalDebits: original.totalDebits ?? 0,
    originalTotalCredits: original.totalCredits ?? 0,
    originalClosingBalance: original.closingBalance ?? 0,
    children: (node.children ?? []).map(convertClosureNode),
    thirdPartyChildren: (node.thirdPartyChildren ?? []).map((tpNode) => {
      const tpOrig = tpNode.original ?? {}
      const tpSim = tpNode.simulated ?? {}
      return {
        thirdPartyId: tpNode.thirdPartyId,
        thirdPartyName: tpNode.thirdPartyName,
        thirdPartyExternalId: tpNode.thirdPartyExternalId,
        openingBalance: tpSim.openingBalance ?? tpOrig.openingBalance ?? 0,
        totalDebits: tpSim.totalDebits ?? tpOrig.totalDebits ?? 0,
        totalCredits: tpSim.totalCredits ?? tpOrig.totalCredits ?? 0,
        closingBalance: tpSim.closingBalance ?? tpOrig.closingBalance ?? 0,
        originalOpeningBalance: tpOrig.openingBalance ?? 0,
        originalTotalDebits: tpOrig.totalDebits ?? 0,
        originalTotalCredits: tpOrig.totalCredits ?? 0,
        originalClosingBalance: tpOrig.closingBalance ?? 0,
      }
    }),
  }
}

/**
 * Normalize the `accounts` of a period summary response: closure responses (with `original`/`simulated`)
 * are converted to the flat AccountPeriodNode shape, plain responses are returned as they are.
 */
export function toAccountNodes(accounts: SummaryNode[]): AccountPeriodNode[] {
  return accounts.map((node) =>
    'original' in node && node.original !== undefined ? convertClosureNode(node as ClosureNode) : (node as AccountPeriodNode),
  )
}

export function usePeriodAccountSummary(
  workspaceId: string | null | undefined,
  fromDate: string,
  toDate: string,
  simulateClosure?: boolean,
  includeZeroAccounts?: boolean,
) {
  const query: Record<string, string | boolean> = {
    fromDate,
    toDate,
  }
  if (simulateClosure) query.simulateClosure = simulateClosure
  if (includeZeroAccounts) query.includeZeroAccounts = includeZeroAccounts

  return useApiQuery<PeriodAccountSummary>(
    queryKeys.reports.periodAccountSummary(workspaceId!, { fromDate, toDate, simulateClosure, includeZeroAccounts }),
    async () => {
      const response = await apiClient.query.GET('/reports/period-account-summary', {
        params: { query },
        headers: { 'X-Workspace-Id': workspaceId! },
      })
      if (response.error) {
        throw response.error
      }
      const data = response.data as { fromDate: string; toDate: string; accounts?: SummaryNode[] }

      // Handle both PeriodAccountSummaryResponse and PeriodAccountSummaryWithClosureResponse
      const accounts = toAccountNodes(data.accounts ?? [])

      return {
        data: {
          fromDate: data.fromDate,
          toDate: data.toDate,
          accounts,
        } as PeriodAccountSummary,
        response,
      }
    },
    {
      enabled: Boolean(workspaceId) && Boolean(fromDate) && Boolean(toDate),
      // Keep the previous period on screen while the new one loads, so views that read
      // account names from the summary (e.g. the transaction header) do not lose them
      placeholderData: keepPreviousData,
    },
  )
}

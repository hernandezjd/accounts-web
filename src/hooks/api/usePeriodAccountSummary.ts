import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { AccountPeriodNode, PeriodAccountSummary } from '@/types/accounting'

/**
 * Convert a closure response node back to AccountPeriodNode format.
 * Uses simulated balances when available, and preserves originals for UI diffing.
 */
function convertClosureNode(node: any): AccountPeriodNode {
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
    thirdPartyChildren: (node.thirdPartyChildren ?? []).map((tpNode: any) => {
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

async function fetchPeriodAccountSummary(
  tenantId: string,
  fromDate: string,
  toDate: string,
  simulateClosure?: boolean,
): Promise<PeriodAccountSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET('/reports/period-account-summary', {
    params: {
      query: {
        fromDate,
        toDate,
        ...(simulateClosure ? { simulateClosure } : {}),
      },
      header: { 'X-Tenant-Id': tenantId },
    },
  })
  if (error) throw error
  const resp = data as any

  // Handle both PeriodAccountSummaryResponse and PeriodAccountSummaryWithClosureResponse
  const accounts = (resp.accounts ?? []).map((node: any) =>
    // Check if this is a closure response (has original/simulated fields)
    node.original !== undefined ? convertClosureNode(node) : node
  )

  return {
    fromDate: resp.fromDate,
    toDate: resp.toDate,
    accounts,
  }
}

export function usePeriodAccountSummary(
  tenantId: string | null | undefined,
  fromDate: string,
  toDate: string,
  simulateClosure?: boolean,
) {
  return useQuery({
    queryKey: queryKeys.reports.periodAccountSummary(tenantId!, { fromDate, toDate, simulateClosure }),
    queryFn: () => fetchPeriodAccountSummary(tenantId!, fromDate, toDate, simulateClosure),
    enabled: Boolean(tenantId) && Boolean(fromDate) && Boolean(toDate),
  })
}

import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
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

export function usePeriodAccountSummary(
  tenantId: string | null | undefined,
  fromDate: string,
  toDate: string,
  simulateClosure?: boolean,
) {
  const query: Record<string, string | boolean> = {
    fromDate,
    toDate,
  }
  if (simulateClosure) query.simulateClosure = simulateClosure

  return useApiQuery<PeriodAccountSummary>(
    queryKeys.reports.periodAccountSummary(tenantId!, { fromDate, toDate, simulateClosure }),
    async () => {
      const response = await apiClient.query.GET('/reports/period-account-summary', {
        params: {
          query,
          header: { 'X-Tenant-Id': tenantId! },
        },
      })
      if (response.error) {
        throw response.error
      }
      const data = response.data as any

      // Handle both PeriodAccountSummaryResponse and PeriodAccountSummaryWithClosureResponse
      const accounts = (data.accounts ?? []).map((node: any) =>
        // Check if this is a closure response (has original/simulated fields)
        node.original !== undefined ? convertClosureNode(node) : node
      )

      return {
        data: {
          fromDate: data.fromDate,
          toDate: data.toDate,
          accounts,
        } as PeriodAccountSummary,
        response,
      }
    },
    { enabled: Boolean(tenantId) && Boolean(fromDate) && Boolean(toDate) },
  )
}

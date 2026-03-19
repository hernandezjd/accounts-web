import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import { queryKeys } from '@/api/queryKeys'
import type { AccountPeriodNode, PeriodAccountSummary } from '@/types/accounting'

/**
 * Convert a closure response node back to AccountPeriodNode format.
 * Uses simulated balances when available, otherwise falls back to original.
 */
function convertClosureNode(node: any): AccountPeriodNode {
  return {
    accountId: node.accountId,
    accountCode: node.accountCode,
    accountName: node.accountName,
    level: node.level,
    // Use simulated balances if available, otherwise use original
    openingBalance: node.simulated?.openingBalance ?? node.original?.openingBalance ?? 0,
    totalDebits: node.simulated?.totalDebits ?? node.original?.totalDebits ?? 0,
    totalCredits: node.simulated?.totalCredits ?? node.original?.totalCredits ?? 0,
    closingBalance: node.simulated?.closingBalance ?? node.original?.closingBalance ?? 0,
    children: (node.children ?? []).map(convertClosureNode),
    thirdPartyChildren: (node.thirdPartyChildren ?? []).map((tpNode: any) => ({
      thirdPartyId: tpNode.thirdPartyId,
      thirdPartyName: tpNode.thirdPartyName,
      thirdPartyExternalId: tpNode.thirdPartyExternalId,
      openingBalance: tpNode.simulated?.openingBalance ?? tpNode.original?.openingBalance ?? 0,
      totalDebits: tpNode.simulated?.totalDebits ?? tpNode.original?.totalDebits ?? 0,
      totalCredits: tpNode.simulated?.totalCredits ?? tpNode.original?.totalCredits ?? 0,
      closingBalance: tpNode.simulated?.closingBalance ?? tpNode.original?.closingBalance ?? 0,
    })),
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

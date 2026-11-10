import { useQueries } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { AccountPeriodNode } from '@/types/accounting'
import { toAccountNodes } from '@/hooks/api/usePeriodAccountSummary'

/** The balances of one extra currency, looked up by account (and by account + third party). */
export interface ExtraCurrencyColumn {
  currency: string
  /** False while loading or when the request failed: the column shows a dash, not a zero. */
  ready: boolean
  closingByAccount: Map<string, number>
  closingByThirdParty: Map<string, number>
  /** The closing balances before closure simulation; equal to the closing ones when not simulated. */
  originalClosingByAccount: Map<string, number>
  originalClosingByThirdParty: Map<string, number>
}

export function thirdPartyKey(accountId: string, thirdPartyId: string): string {
  return `${accountId}:${thirdPartyId}`
}

function collect(nodes: AccountPeriodNode[], column: ExtraCurrencyColumn) {
  for (const node of nodes) {
    column.closingByAccount.set(node.accountId, node.closingBalance)
    column.originalClosingByAccount.set(node.accountId, node.originalClosingBalance ?? node.closingBalance)
    for (const tp of node.thirdPartyChildren ?? []) {
      const key = thirdPartyKey(node.accountId, tp.thirdPartyId)
      column.closingByThirdParty.set(key, tp.closingBalance)
      column.originalClosingByThirdParty.set(key, tp.originalClosingBalance ?? tp.closingBalance)
    }
    collect(node.children ?? [], column)
  }
}

/**
 * One period summary per extra currency (MC-22): the same request as the main table with its own `currency=`.
 * When closure simulation is on, the extra columns are simulated the same way as the main table, so nominal
 * accounts show zero and the P&L account shows the transferred result in that currency.
 * A currency that fails does not break the table, its column shows dashes.
 */
export function useExtraCurrencySummaries(
  workspaceId: string | null | undefined,
  fromDate: string,
  toDate: string,
  currencies: string[],
  simulateClosure = false,
): ExtraCurrencyColumn[] {
  return useQueries({
    queries: currencies.map((currency) => ({
      queryKey: queryKeys.reports.periodAccountSummary(workspaceId!, {
        fromDate,
        toDate,
        currency,
        extra: true,
        simulateClosure,
      }),
      enabled: Boolean(workspaceId) && Boolean(fromDate) && Boolean(toDate),
      retry: false,
      queryFn: async () => {
        const query: Record<string, string | boolean> = { fromDate, toDate, currency, includeZeroAccounts: true }
        if (simulateClosure) query.simulateClosure = true
        const response = await apiClient.query.GET('/reports/period-account-summary', {
          params: { query: query as never },
          headers: { 'X-Workspace-Id': workspaceId! },
        })
        if (response.error) throw response.error
        return toAccountNodes((response.data as { accounts?: Parameters<typeof toAccountNodes>[0] }).accounts ?? [])
      },
    })),
    combine: (results) =>
      results.map((result, index) => {
        const column: ExtraCurrencyColumn = {
          currency: currencies[index],
          ready: result.isSuccess,
          closingByAccount: new Map(),
          closingByThirdParty: new Map(),
          originalClosingByAccount: new Map(),
          originalClosingByThirdParty: new Map(),
        }
        if (result.data) collect(result.data, column)
        return column
      }),
  })
}

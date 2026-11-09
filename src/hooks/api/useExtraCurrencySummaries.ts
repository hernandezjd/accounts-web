import { useQueries } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import type { AccountPeriodNode } from '@/types/accounting'

/** The balances of one extra currency, looked up by account (and by account + third party). */
export interface ExtraCurrencyColumn {
  currency: string
  /** False while loading or when the request failed: the column shows a dash, not a zero. */
  ready: boolean
  closingByAccount: Map<string, number>
  closingByThirdParty: Map<string, number>
}

export function thirdPartyKey(accountId: string, thirdPartyId: string): string {
  return `${accountId}:${thirdPartyId}`
}

function collect(nodes: AccountPeriodNode[], column: ExtraCurrencyColumn) {
  for (const node of nodes) {
    column.closingByAccount.set(node.accountId, node.closingBalance)
    for (const tp of node.thirdPartyChildren ?? []) {
      column.closingByThirdParty.set(thirdPartyKey(node.accountId, tp.thirdPartyId), tp.closingBalance)
    }
    collect(node.children ?? [], column)
  }
}

/**
 * One period summary per extra currency (MC-22): the same request as the main table with its own `currency=`.
 * A currency that fails does not break the table, its column shows dashes.
 */
export function useExtraCurrencySummaries(
  workspaceId: string | null | undefined,
  fromDate: string,
  toDate: string,
  currencies: string[],
): ExtraCurrencyColumn[] {
  return useQueries({
    queries: currencies.map((currency) => ({
      queryKey: queryKeys.reports.periodAccountSummary(workspaceId!, { fromDate, toDate, currency, extra: true }),
      enabled: Boolean(workspaceId) && Boolean(fromDate) && Boolean(toDate),
      retry: false,
      queryFn: async () => {
        const response = await apiClient.query.GET('/reports/period-account-summary', {
          params: { query: { fromDate, toDate, currency, includeZeroAccounts: true } as never },
          headers: { 'X-Workspace-Id': workspaceId! },
        })
        if (response.error) throw response.error
        return ((response.data as { accounts?: AccountPeriodNode[] }).accounts ?? []) as AccountPeriodNode[]
      },
    })),
    combine: (results) =>
      results.map((result, index) => {
        const column: ExtraCurrencyColumn = {
          currency: currencies[index],
          ready: result.isSuccess,
          closingByAccount: new Map(),
          closingByThirdParty: new Map(),
        }
        if (result.data) collect(result.data, column)
        return column
      }),
  })
}

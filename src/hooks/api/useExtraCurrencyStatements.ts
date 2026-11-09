import { useQueries } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'

/** The statement of one account in an extra currency, looked up by transaction. */
export interface ExtraStatementColumn {
  currency: string
  /** False while loading or when the request failed (for example the account does not track the currency). */
  ready: boolean
  closingBalance: number | null
  runningBalanceByTransaction: Map<string, number>
}

/**
 * One account statement per extra currency (MC-23): the same request as the main statement with its own
 * `currency=`. The balances come from the backend; the web only lines them up by transaction.
 */
export function useExtraCurrencyStatements(
  workspaceId: string | null | undefined,
  accountId: string | null | undefined,
  fromDate: string,
  toDate: string,
  currencies: string[],
  thirdPartyId?: string,
): ExtraStatementColumn[] {
  return useQueries({
    queries: currencies.map((currency) => ({
      queryKey: ['accountTransactions', workspaceId, accountId, fromDate, toDate, thirdPartyId ?? null, { extra: currency }],
      enabled: Boolean(workspaceId) && Boolean(accountId) && Boolean(fromDate) && Boolean(toDate),
      retry: false,
      queryFn: async () => {
        const query: Record<string, string> = { fromDate, toDate, currency }
        if (thirdPartyId) query.thirdPartyId = thirdPartyId
        const response = await apiClient.query.GET('/reports/accounts/{accountId}/transactions', {
          params: {
            path: { accountId: accountId! },
            query: query as never,
            header: { 'X-Workspace-Id': workspaceId! },
          },
        })
        if (response.error) throw response.error
        return response.data as {
          closingBalance: number
          transactions: { transactionId: string; runningBalance: number }[]
        }
      },
    })),
    combine: (results) =>
      results.map((result, index) => ({
        currency: currencies[index],
        ready: result.isSuccess,
        closingBalance: result.data?.closingBalance ?? null,
        runningBalanceByTransaction: new Map(
          (result.data?.transactions ?? []).map((t) => [t.transactionId, t.runningBalance] as const),
        ),
      })),
  })
}

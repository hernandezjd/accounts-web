import { useApiQuery } from '@/hooks/api/useApiQuery'
import { apiClient } from '@/api/apiClient'
import type { AccountTransactionDetail } from '@/types/accounting'
import type { components } from '@/api/generated/reporting-api'

type ApiResponse = components['schemas']['AccountTransactionDetailResponse']

export function useAccountTransactionsInPeriod(
  tenantId: string | null | undefined,
  accountId: string | null | undefined,
  fromDate: string,
  toDate: string,
  thirdPartyId?: string,
) {
  const query: Record<string, string> = { fromDate, toDate }
  if (thirdPartyId) query.thirdPartyId = thirdPartyId

  return useApiQuery<AccountTransactionDetail>(
    ['accountTransactions', tenantId, accountId, fromDate, toDate, thirdPartyId ?? null],
    async () => {
      const response = await apiClient.query.GET(
        '/reports/accounts/{accountId}/transactions',
        {
          params: {
            path: { accountId: accountId! },
            query,
            header: { 'X-Tenant-Id': tenantId! },
          },
        },
      )
      const data = response.data as ApiResponse
      return {
        data: {
          accountId: data.accountId,
          fromDate: data.fromDate,
          toDate: data.toDate,
          thirdPartyId: data.thirdPartyId ?? null,
          openingBalance: data.openingBalance,
          transactions: data.transactions,
        } as AccountTransactionDetail,
        response,
      }
    },
    { enabled: Boolean(tenantId) && Boolean(accountId) && Boolean(fromDate) && Boolean(toDate) },
  )
}

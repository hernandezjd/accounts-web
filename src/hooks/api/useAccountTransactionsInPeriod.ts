import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/clients'
import type { AccountTransactionDetail } from '@/types/accounting'
import type { components } from '@/api/generated/reporting-api'

type ApiResponse = components['schemas']['AccountTransactionDetailResponse']

async function fetchAccountTransactionsInPeriod(
  tenantId: string,
  accountId: string,
  fromDate: string,
  toDate: string,
  thirdPartyId?: string,
): Promise<AccountTransactionDetail> {
  const query: Record<string, string> = { fromDate, toDate }
  if (thirdPartyId) query.thirdPartyId = thirdPartyId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (queryClient as any).GET(
    '/reports/accounts/{accountId}/transactions',
    {
      params: {
        path: { accountId },
        query,
        header: { 'X-Tenant-Id': tenantId },
      },
    },
  )
  if (error) throw new Error('Failed to fetch account transactions')
  const resp = data as ApiResponse
  return {
    accountId: resp.accountId,
    fromDate: resp.fromDate,
    toDate: resp.toDate,
    thirdPartyId: resp.thirdPartyId ?? null,
    openingBalance: resp.openingBalance,
    transactions: resp.transactions,
  }
}

export function useAccountTransactionsInPeriod(
  tenantId: string | null | undefined,
  accountId: string | null | undefined,
  fromDate: string,
  toDate: string,
  thirdPartyId?: string,
) {
  return useQuery({
    queryKey: ['accountTransactions', tenantId, accountId, fromDate, toDate, thirdPartyId ?? null],
    queryFn: () =>
      fetchAccountTransactionsInPeriod(tenantId!, accountId!, fromDate, toDate, thirdPartyId),
    enabled: Boolean(tenantId) && Boolean(accountId) && Boolean(fromDate) && Boolean(toDate),
  })
}

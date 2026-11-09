import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { useApiMutation } from '@/hooks/api/useApiMutation'
import { useApiQuery } from '@/hooks/api/useApiQuery'
import type { components } from '@/api/generated/exchange-rate-api'

export type ExchangeRate = components['schemas']['ExchangeRateResponse']
export type PutRateRequest = components['schemas']['PutRateRequest']
export type RateSource = components['schemas']['RateSourceResponse']
export type RateSourceRequest = components['schemas']['RateSourceRequest']
export type RateJobRun = components['schemas']['RateJobRunResponse']

export interface RateFilters {
  base?: string
  currency?: string
  includeSuperseded?: boolean
}

/** The rates of the table, newest first (MC-16, MC-18). */
export function useExchangeRates(filters: RateFilters) {
  const query: Record<string, string> = {}
  if (filters.base) query.base = filters.base
  if (filters.currency) query.currency = filters.currency
  if (filters.includeSuperseded) query.includeSuperseded = 'true'
  return useApiQuery<ExchangeRate[]>(queryKeys.exchangeRates.list(query), () =>
    apiClient.command.GET('/rates', { params: { query } }),
  )
}

export function useRateSources() {
  return useApiQuery<RateSource[]>(queryKeys.exchangeRates.sources(), () => apiClient.command.GET('/rates/sources'))
}

/** The latest runs of the rate job; a FAILED one is the alert of MC-17. */
export function useRateJobRuns() {
  return useApiQuery<RateJobRun[]>(queryKeys.exchangeRates.jobRuns(), () => apiClient.command.GET('/rates/job-runs'))
}

export function useExchangeRateMutations() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.exchangeRates.all() })

  const putRate = useApiMutation((body: PutRateRequest) => apiClient.command.PUT<ExchangeRate>('/rates', { body }), {
    onSuccess: refresh,
  })
  const createSource = useApiMutation(
    (body: RateSourceRequest) => apiClient.command.POST<RateSource>('/rates/sources', { body }),
    { onSuccess: refresh },
  )
  const updateSource = useApiMutation(
    ({ id, body }: { id: string; body: RateSourceRequest }) =>
      apiClient.command.PUT<RateSource>('/rates/sources/{id}', { params: { path: { id } }, body }),
    { onSuccess: refresh },
  )
  const deleteSource = useApiMutation(
    (id: string) => apiClient.command.DELETE('/rates/sources/{id}', { params: { path: { id } } }),
    { onSuccess: refresh },
  )
  const runJob = useApiMutation(() => apiClient.command.POST<RateJobRun>('/rates/refresh', {}), { onSuccess: refresh })

  return { putRate, createSource, updateSource, deleteSource, runJob }
}

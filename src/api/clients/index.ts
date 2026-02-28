import createClient from 'openapi-fetch'

const tenantBaseUrl = import.meta.env.VITE_TENANT_API_URL ?? 'http://localhost:8083'
const commandBaseUrl = import.meta.env.VITE_COMMAND_API_URL ?? 'http://localhost:8081'
const queryBaseUrl = import.meta.env.VITE_QUERY_API_URL ?? 'http://localhost:8082'

/** Client for the Tenant Service (port 8083) */
export const tenantClient = createClient({ baseUrl: tenantBaseUrl })

/** Client for Command Services: accounts, third-parties, transactions, transaction-types, config, initial-balance (port 8081) */
export const commandClient = createClient({ baseUrl: commandBaseUrl })

/** Client for Query Services and Reporting (port 8082) */
export const queryClient = createClient({ baseUrl: queryBaseUrl })

/**
 * Centralized query key definitions for React Query
 *
 * Query keys follow a hierarchical structure to enable precise cache invalidation:
 * - Top level: resource type (accounts, third-parties, transactions, etc.)
 * - Second level: scope (tenant-scoped or global)
 * - Lower levels: filters, IDs, variations
 *
 * Cache invalidation maps show which mutations affect which queries.
 * When a mutation succeeds, it invalidates all related query keys.
 */

export const queryKeys = {
  // =====================================================================
  // ACCOUNTS (Tenant-scoped)
  // =====================================================================
  accounts: {
    all: () => ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all(), 'list'] as const,
    list: (tenantId: string, includeInactive = false) =>
      [...queryKeys.accounts.lists(), { tenantId, includeInactive }] as const,
    details: () => [...queryKeys.accounts.all(), 'detail'] as const,
    detail: (tenantId: string, id: string) =>
      [...queryKeys.accounts.details(), { tenantId, id }] as const,
    hierarchy: (tenantId: string) =>
      [...queryKeys.accounts.all(), { tenantId }, 'hierarchy'] as const,
    dropdowns: (tenantId: string) =>
      [...queryKeys.accounts.all(), { tenantId }, 'dropdowns'] as const,
  },

  // =====================================================================
  // THIRD PARTIES (Tenant-scoped and global variants)
  // =====================================================================
  thirdParties: {
    all: () => ['third-parties'] as const,
    lists: () => [...queryKeys.thirdParties.all(), 'list'] as const,
    list: (tenantId: string, name?: string) =>
      [...queryKeys.thirdParties.lists(), { tenantId, name }] as const,
    // Global list (no tenant filtering)
    allGlobal: () => [...queryKeys.thirdParties.all(), 'all-global'] as const,
    details: () => [...queryKeys.thirdParties.all(), 'detail'] as const,
    detail: (tenantId: string, id: string) =>
      [...queryKeys.thirdParties.details(), { tenantId, id }] as const,
    dropdowns: (tenantId: string) =>
      [...queryKeys.thirdParties.all(), { tenantId }, 'dropdowns'] as const,
  },

  // =====================================================================
  // TRANSACTION TYPES (Tenant-scoped)
  // =====================================================================
  transactionTypes: {
    all: () => ['transaction-types'] as const,
    lists: () => [...queryKeys.transactionTypes.all(), 'list'] as const,
    list: (tenantId: string, name?: string | null) =>
      [...queryKeys.transactionTypes.lists(), { tenantId, name }] as const,
    dropdowns: (tenantId: string) =>
      [...queryKeys.transactionTypes.all(), { tenantId }, 'dropdowns'] as const,
  },

  // =====================================================================
  // TRANSACTIONS (Tenant-scoped)
  // =====================================================================
  transactions: {
    all: () => ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all(), 'list'] as const,
    list: (
      tenantId: string,
      filters?: Record<string, unknown>
    ) =>
      [...queryKeys.transactions.lists(), { tenantId, filters }] as const,
    details: () => [...queryKeys.transactions.all(), 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.transactions.details(), { id }] as const,
    byAccount: (tenantId: string) =>
      [...queryKeys.transactions.all(), { tenantId }, 'by-account'] as const,
    inPeriod: (tenantId: string, period?: unknown) =>
      [...queryKeys.transactions.all(), { tenantId }, 'in-period', period] as const,
  },

  // =====================================================================
  // INITIAL BALANCES (Tenant-scoped)
  // =====================================================================
  initialBalances: {
    all: () => ['initial-balances'] as const,
    lists: () => [...queryKeys.initialBalances.all(), 'list'] as const,
    list: (tenantId: string) =>
      [...queryKeys.initialBalances.lists(), { tenantId }] as const,
  },

  // =====================================================================
  // TENANT CONFIGURATION (Tenant-scoped)
  // =====================================================================
  tenantConfig: {
    all: () => ['tenant-config'] as const,
    details: () => [...queryKeys.tenantConfig.all(), 'detail'] as const,
    detail: (tenantId: string) =>
      [...queryKeys.tenantConfig.details(), { tenantId }] as const,
  },

  // =====================================================================
  // CODE STRUCTURE CONFIG (Tenant-scoped)
  // =====================================================================
  codeStructureConfig: {
    all: () => ['code-structure-config'] as const,
    details: () => [...queryKeys.codeStructureConfig.all(), 'detail'] as const,
    detail: (tenantId: string) =>
      [...queryKeys.codeStructureConfig.details(), { tenantId }] as const,
  },

  // =====================================================================
  // TENANTS (Global)
  // =====================================================================
  tenants: {
    all: () => ['tenants'] as const,
    lists: () => [...queryKeys.tenants.all(), 'list'] as const,
    list: () => [...queryKeys.tenants.lists()] as const,
    details: () => [...queryKeys.tenants.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.tenants.details(), { id }] as const,
  },

  // =====================================================================
  // REPORTING / ANALYTICS (Tenant-scoped)
  // =====================================================================
  reports: {
    all: () => ['reports'] as const,
    periodAccountSummary: (tenantId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { tenantId }, 'period-account-summary', filters] as const,
    balanceAtDate: (tenantId: string, accountId: string, date?: string) =>
      [...queryKeys.reports.all(), { tenantId, accountId }, 'balance-at-date', date] as const,
    balanceAtLevel: (tenantId: string, level: number, date?: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { tenantId, level }, 'balance-at-level', date, filters] as const,
    periodReport: (tenantId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { tenantId }, 'period-report', filters] as const,
    closingPreview: (tenantId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { tenantId }, 'closing-preview', filters] as const,
    thirdPartyBalanceAtDate: (
      tenantId: string,
      accountId: string,
      thirdPartyId: string,
      date?: string
    ) =>
      [...queryKeys.reports.all(), { tenantId, accountId, thirdPartyId }, 'tp-balance-at-date', date] as const,
    thirdPartyBalances: (tenantId: string, accountId: string, date?: string) =>
      [...queryKeys.reports.all(), { tenantId, accountId }, 'tp-balances', date] as const,
    thirdPartyPeriod: (tenantId: string, accountId: string, thirdPartyId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { tenantId, accountId, thirdPartyId }, 'tp-period', filters] as const,
  },

  // =====================================================================
  // SEARCH
  // =====================================================================
  search: {
    all: () => ['search'] as const,
    unified: (tenantId: string, query: string, allHistory = false) =>
      [...queryKeys.search.all(), { tenantId, query, allHistory }] as const,
  },
};

/**
 * CACHE INVALIDATION MATRIX
 *
 * This documents which mutations invalidate which query keys.
 * Use these when configuring mutation success handlers.
 */
export const cacheInvalidationMap = {
  // Accounts mutations
  createAccount: {
    invalidates: [
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'New account affects account lists and all reports',
  },
  updateAccount: {
    invalidates: [
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'Updated account affects lists and reports',
  },
  deactivateAccount: {
    invalidates: [
      queryKeys.accounts.all(),
      queryKeys.thirdParties.all(),
      queryKeys.reports.all(),
    ],
    description: 'Deactivated account affects lists, dropdowns, and reports',
  },
  activateAccount: {
    invalidates: [
      queryKeys.accounts.all(),
      queryKeys.thirdParties.all(),
      queryKeys.reports.all(),
    ],
    description: 'Activated account affects lists, dropdowns, and reports',
  },
  toggleHasThirdParties: {
    invalidates: [
      queryKeys.accounts.all(),
      queryKeys.thirdParties.all(),
      queryKeys.reports.all(),
    ],
    description: 'Third-party flag change affects account structure and reports',
  },

  // Third-party mutations
  createThirdParty: {
    invalidates: [
      queryKeys.thirdParties.all(),
      queryKeys.transactions.all(),
      queryKeys.reports.all(),
    ],
    description: 'New third-party affects lists, transaction forms, and reports',
  },
  updateThirdParty: {
    invalidates: [
      queryKeys.thirdParties.all(),
      queryKeys.transactions.all(),
      queryKeys.reports.all(),
    ],
    description: 'Updated third-party affects lists and reports',
  },
  deactivateThirdParty: {
    invalidates: [
      queryKeys.thirdParties.all(),
      queryKeys.transactions.all(),
      queryKeys.reports.all(),
    ],
    description: 'Deactivated third-party affects dropdowns and reports',
  },
  activateThirdParty: {
    invalidates: [
      queryKeys.thirdParties.all(),
      queryKeys.transactions.all(),
      queryKeys.reports.all(),
    ],
    description: 'Activated third-party affects dropdowns and reports',
  },

  // Transaction type mutations
  createTransactionType: {
    invalidates: [
      queryKeys.transactionTypes.all(),
      queryKeys.transactions.all(),
    ],
    description: 'New transaction type affects type list and transaction forms',
  },
  updateTransactionType: {
    invalidates: [
      queryKeys.transactionTypes.all(),
      queryKeys.transactions.all(),
    ],
    description: 'Updated transaction type affects lists and forms',
  },
  deleteTransactionType: {
    invalidates: [
      queryKeys.transactionTypes.all(),
      queryKeys.transactions.all(),
    ],
    description: 'Deleted transaction type affects lists and transaction forms',
  },

  // Transaction mutations
  createTransaction: {
    invalidates: [
      queryKeys.transactions.all(),
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'New transaction affects all transaction queries and account balances',
  },
  editTransaction: {
    invalidates: [
      queryKeys.transactions.all(),
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'Edited transaction affects queries and account balances',
  },
  deleteTransaction: {
    invalidates: [
      queryKeys.transactions.all(),
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'Deleted transaction affects queries and account balances',
  },

  // Initial balance mutations
  createInitialBalance: {
    invalidates: [
      queryKeys.initialBalances.all(),
      queryKeys.transactions.all(),
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'New initial balance affects balance list, transactions, and reports',
  },
  editInitialBalance: {
    invalidates: [
      queryKeys.initialBalances.all(),
      queryKeys.transactions.all(),
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'Edited initial balance affects lists and reports',
  },
  deleteInitialBalance: {
    invalidates: [
      queryKeys.initialBalances.all(),
      queryKeys.transactions.all(),
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'Deleted initial balance affects balance list, transactions, and reports',
  },

  // Configuration mutations
  setInitialDate: {
    invalidates: [
      queryKeys.tenantConfig.all(),
      queryKeys.transactions.all(),
      queryKeys.reports.all(),
    ],
    description: 'Initial date change affects config and all transaction/report queries',
  },
  setClosedPeriodDate: {
    invalidates: [
      queryKeys.tenantConfig.all(),
      queryKeys.transactions.all(),
      queryKeys.reports.all(),
    ],
    description: 'Closed period change affects config and transaction queries',
  },
  setMinimumAccountLevel: {
    invalidates: [
      queryKeys.tenantConfig.all(),
      queryKeys.reports.all(),
    ],
    description: 'Account level config affects reports',
  },
  setSnapshotFrequency: {
    invalidates: [
      queryKeys.tenantConfig.all(),
      queryKeys.reports.all(),
    ],
    description: 'Snapshot frequency affects reporting queries',
  },
  configureCodeStructure: {
    invalidates: [
      queryKeys.codeStructureConfig.all(),
      queryKeys.accounts.all(),
    ],
    description: 'Code structure change affects account validation',
  },

  // Tenant mutations
  createTenant: {
    invalidates: [
      queryKeys.tenants.all(),
    ],
    description: 'New tenant affects tenant list',
  },
  updateTenant: {
    invalidates: [
      queryKeys.tenants.all(),
    ],
    description: 'Updated tenant affects tenant list',
  },
  deactivateTenant: {
    invalidates: [
      queryKeys.tenants.all(),
    ],
    description: 'Deactivated tenant affects tenant list',
  },
  reactivateTenant: {
    invalidates: [
      queryKeys.tenants.all(),
    ],
    description: 'Reactivated tenant affects tenant list',
  },
  deleteTenant: {
    invalidates: [
      queryKeys.tenants.all(),
    ],
    description: 'Deleted tenant affects tenant list',
  },
};

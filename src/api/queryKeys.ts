/**
 * Centralized query key definitions for React Query
 *
 * Query keys follow a hierarchical structure to enable precise cache invalidation:
 * - Top level: resource type (accounts, third-parties, transactions, etc.)
 * - Second level: scope (workspace-scoped or global)
 * - Lower levels: filters, IDs, variations
 *
 * Cache invalidation maps show which mutations affect which queries.
 * When a mutation succeeds, it invalidates all related query keys.
 */

export const queryKeys = {
  // =====================================================================
  // ACCOUNTS (Workspace-scoped)
  // =====================================================================
  accounts: {
    all: () => ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all(), 'list'] as const,
    list: (workspaceId: string, includeInactive = false) =>
      [...queryKeys.accounts.lists(), { workspaceId, includeInactive }] as const,
    details: () => [...queryKeys.accounts.all(), 'detail'] as const,
    detail: (workspaceId: string, id: string) =>
      [...queryKeys.accounts.details(), { workspaceId, id }] as const,
    hierarchy: (workspaceId: string) =>
      [...queryKeys.accounts.all(), { workspaceId }, 'hierarchy'] as const,
    dropdowns: (workspaceId: string) =>
      [...queryKeys.accounts.all(), { workspaceId }, 'dropdowns'] as const,
  },

  // =====================================================================
  // THIRD PARTIES (Workspace-scoped and global variants)
  // =====================================================================
  thirdParties: {
    all: () => ['third-parties'] as const,
    lists: () => [...queryKeys.thirdParties.all(), 'list'] as const,
    list: (workspaceId: string, name?: string) =>
      [...queryKeys.thirdParties.lists(), { workspaceId, name }] as const,
    // Global list (no workspace filtering)
    allGlobal: () => [...queryKeys.thirdParties.all(), 'all-global'] as const,
    details: () => [...queryKeys.thirdParties.all(), 'detail'] as const,
    detail: (workspaceId: string, id: string) =>
      [...queryKeys.thirdParties.details(), { workspaceId, id }] as const,
    dropdowns: (workspaceId: string) =>
      [...queryKeys.thirdParties.all(), { workspaceId }, 'dropdowns'] as const,
  },

  // =====================================================================
  // TRANSACTION TYPES (Workspace-scoped)
  // =====================================================================
  transactionTypes: {
    all: () => ['transaction-types'] as const,
    lists: () => [...queryKeys.transactionTypes.all(), 'list'] as const,
    list: (workspaceId: string, name?: string | null) =>
      [...queryKeys.transactionTypes.lists(), { workspaceId, name }] as const,
    dropdowns: (workspaceId: string) =>
      [...queryKeys.transactionTypes.all(), { workspaceId }, 'dropdowns'] as const,
  },

  // =====================================================================
  // TRANSACTIONS (Workspace-scoped)
  // =====================================================================
  transactions: {
    all: () => ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all(), 'list'] as const,
    list: (
      workspaceId: string,
      filters?: Record<string, unknown>
    ) =>
      [...queryKeys.transactions.lists(), { workspaceId, filters }] as const,
    details: () => [...queryKeys.transactions.all(), 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.transactions.details(), { id }] as const,
    byAccount: (workspaceId: string) =>
      [...queryKeys.transactions.all(), { workspaceId }, 'by-account'] as const,
    inPeriod: (workspaceId: string, period?: unknown) =>
      [...queryKeys.transactions.all(), { workspaceId }, 'in-period', period] as const,
  },

  // =====================================================================
  // INITIAL BALANCES (Workspace-scoped)
  // =====================================================================
  initialBalances: {
    all: () => ['initial-balances'] as const,
    lists: () => [...queryKeys.initialBalances.all(), 'list'] as const,
    list: (workspaceId: string) =>
      [...queryKeys.initialBalances.lists(), { workspaceId }] as const,
  },

  // =====================================================================
  // WORKSPACE CONFIGURATION (Workspace-scoped)
  // =====================================================================
  workspaceConfig: {
    all: () => ['workspace-config'] as const,
    details: () => [...queryKeys.workspaceConfig.all(), 'detail'] as const,
    detail: (workspaceId: string) =>
      [...queryKeys.workspaceConfig.details(), { workspaceId }] as const,
  },

  // =====================================================================
  // CODE STRUCTURE CONFIG (Workspace-scoped)
  // =====================================================================
  codeStructureConfig: {
    all: () => ['code-structure-config'] as const,
    details: () => [...queryKeys.codeStructureConfig.all(), 'detail'] as const,
    detail: (workspaceId: string) =>
      [...queryKeys.codeStructureConfig.details(), { workspaceId }] as const,
  },

  // =====================================================================
  // PREFILLED CHARTS (Global)
  // =====================================================================
  prefilledCharts: {
    all: () => ['prefilled-charts'] as const,
    lists: () => [...queryKeys.prefilledCharts.all(), 'list'] as const,
    list: () => [...queryKeys.prefilledCharts.lists()] as const,
    details: () => [...queryKeys.prefilledCharts.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.prefilledCharts.details(), { id }] as const,
  },

  // =====================================================================
  // ORGANIZATIONS (Global)
  // =====================================================================
  organizations: {
    all: () => ['organizations'] as const,
    lists: () => [...queryKeys.organizations.all(), 'list'] as const,
    list: () => [...queryKeys.organizations.lists()] as const,
    details: () => [...queryKeys.organizations.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), { id }] as const,
  },

  // =====================================================================
  // WORKSPACES (Global)
  // =====================================================================
  workspaces: {
    all: () => ['workspaces'] as const,
    lists: () => [...queryKeys.workspaces.all(), 'list'] as const,
    list: () => [...queryKeys.workspaces.lists()] as const,
    details: () => [...queryKeys.workspaces.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.workspaces.details(), { id }] as const,
  },

  // =====================================================================
  // REPORTING / ANALYTICS (Workspace-scoped)
  // =====================================================================
  reports: {
    all: () => ['reports'] as const,
    periodAccountSummary: (workspaceId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { workspaceId }, 'period-account-summary', filters] as const,
    balanceAtDate: (workspaceId: string, accountId: string, date?: string) =>
      [...queryKeys.reports.all(), { workspaceId, accountId }, 'balance-at-date', date] as const,
    balanceAtLevel: (workspaceId: string, level: number, date?: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { workspaceId, level }, 'balance-at-level', date, filters] as const,
    periodReport: (workspaceId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { workspaceId }, 'period-report', filters] as const,
    closingPreview: (workspaceId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { workspaceId }, 'closing-preview', filters] as const,
    thirdPartyBalanceAtDate: (
      workspaceId: string,
      accountId: string,
      thirdPartyId: string,
      date?: string
    ) =>
      [...queryKeys.reports.all(), { workspaceId, accountId, thirdPartyId }, 'tp-balance-at-date', date] as const,
    thirdPartyBalances: (workspaceId: string, accountId: string, date?: string) =>
      [...queryKeys.reports.all(), { workspaceId, accountId }, 'tp-balances', date] as const,
    thirdPartyPeriod: (workspaceId: string, accountId: string, thirdPartyId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all(), { workspaceId, accountId, thirdPartyId }, 'tp-period', filters] as const,
  },

  // =====================================================================
  // SEARCH
  // =====================================================================
  search: {
    all: () => ['search'] as const,
    unified: (workspaceId: string, query: string, allHistory = false) =>
      [...queryKeys.search.all(), { workspaceId, query, allHistory }] as const,
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
      queryKeys.workspaceConfig.all(),
      queryKeys.transactions.all(),
      queryKeys.reports.all(),
    ],
    description: 'Initial date change affects config and all transaction/report queries',
  },
  setClosedPeriodDate: {
    invalidates: [
      queryKeys.workspaceConfig.all(),
      queryKeys.transactions.all(),
      queryKeys.reports.all(),
    ],
    description: 'Closed period change affects config and transaction queries',
  },
  setMinimumAccountLevel: {
    invalidates: [
      queryKeys.workspaceConfig.all(),
      queryKeys.reports.all(),
    ],
    description: 'Account level config affects reports',
  },
  setSnapshotFrequency: {
    invalidates: [
      queryKeys.workspaceConfig.all(),
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

  // Pre-filled chart mutations
  mergePrefilledChart: {
    invalidates: [
      queryKeys.accounts.all(),
      queryKeys.reports.all(),
    ],
    description: 'Merged chart creates new accounts, affects account lists and reports',
  },

  // Workspace mutations
  createWorkspace: {
    invalidates: [
      queryKeys.workspaces.all(),
    ],
    description: 'New workspace affects workspace list',
  },
  updateWorkspace: {
    invalidates: [
      queryKeys.workspaces.all(),
    ],
    description: 'Updated workspace affects workspace list',
  },
  deactivateWorkspace: {
    invalidates: [
      queryKeys.workspaces.all(),
    ],
    description: 'Deactivated workspace affects workspace list',
  },
  reactivateWorkspace: {
    invalidates: [
      queryKeys.workspaces.all(),
    ],
    description: 'Reactivated workspace affects workspace list',
  },
  deleteWorkspace: {
    invalidates: [
      queryKeys.workspaces.all(),
    ],
    description: 'Deleted workspace affects workspace list',
  },
};

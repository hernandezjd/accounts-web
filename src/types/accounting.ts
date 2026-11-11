/**
 * Domain types for the Central Accounting Page.
 * Mirror the generated reporting-api.ts schemas with cleaner names.
 * Field names are identical so no mapping layer is needed.
 */

export type Granularity = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export interface Period {
  from: string
  to: string
}

export interface ThirdPartyPeriodNode {
  thirdPartyId: string
  thirdPartyName: string
  thirdPartyExternalId: string
  openingBalance: number
  totalDebits: number
  totalCredits: number
  closingBalance: number
  /** Original values before closure simulation (only present when simulateClosure=true) */
  originalOpeningBalance?: number
  originalTotalDebits?: number
  originalTotalCredits?: number
  originalClosingBalance?: number
}

export interface AccountPeriodNode {
  accountId: string
  accountCode: string
  accountName: string
  level: number
  openingBalance: number
  totalDebits: number
  totalCredits: number
  closingBalance: number
  children: AccountPeriodNode[]
  thirdPartyChildren: ThirdPartyPeriodNode[]
  /** Original values before closure simulation (only present when simulateClosure=true) */
  originalOpeningBalance?: number
  originalTotalDebits?: number
  originalTotalCredits?: number
  originalClosingBalance?: number
}

export interface PeriodAccountSummary {
  fromDate: string
  toDate: string
  accounts: AccountPeriodNode[]
}

export interface TransactionItemDetail {
  accountId: string
  accountCode: string
  accountName: string
  thirdPartyId?: string | null
  thirdPartyName?: string | null
  debitAmount: number
  creditAmount: number
  /** Native currency of the line. */
  currency?: string | null
  /** Derived value of the line in each other tracked currency. */
  equivalents?: { currency: string; amount: number }[]
}

export interface TransactionWithRunningBalance {
  transactionId: string
  transactionNumber: string
  transactionTypeName: string
  date: string
  description?: string | null
  items: TransactionItemDetail[]
  /** What this transaction debited / credited to the account, in the currency of the statement. */
  debitAmount: number
  creditAmount: number
  runningBalance: number
  /** The valuation the transaction stored: the exact rate used for each non-base currency. */
  valuation?: { rates: { currency: string; rate: number }[] } | null
}

export interface AccountTransactionDetail {
  accountId: string
  fromDate: string
  toDate: string
  thirdPartyId?: string | null
  /** Currency of every statement amount (the requested one, or the base). */
  currency: string
  openingBalance: number
  totalDebits: number
  totalCredits: number
  closingBalance: number
  transactions: TransactionWithRunningBalance[]
}

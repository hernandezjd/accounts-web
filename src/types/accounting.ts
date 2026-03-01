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
}

export interface TransactionWithRunningBalance {
  transactionId: string
  transactionNumber: string
  transactionTypeName: string
  date: string
  description?: string | null
  items: TransactionItemDetail[]
  runningBalance: number
}

export interface AccountTransactionDetail {
  accountId: string
  fromDate: string
  toDate: string
  thirdPartyId?: string | null
  openingBalance: number
  transactions: TransactionWithRunningBalance[]
}

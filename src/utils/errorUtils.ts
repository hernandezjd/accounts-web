import type { TFunction } from 'i18next'

/**
 * Translates a raw API/network error into a user-friendly, domain-specific message.
 *
 * Pattern-matches the error message against known backend error strings and maps
 * them to i18n keys. Never surfaces raw HTTP codes or stack traces.
 */
export function translateApiError(error: unknown, t: TFunction): string {
  const msg = extractMessage(error)

  if (!msg) return t('errors.unknownError')

  const lower = msg.toLowerCase()

  // Network / infrastructure errors
  if (
    error instanceof TypeError ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('connection refused') ||
    lower.includes('load failed')
  ) {
    return t('errors.networkError')
  }

  // Transaction date before initial date
  if (
    lower.includes('transaction_date_before_initial_date') ||
    lower.includes('before the system initial date')
  ) {
    return t('errors.transactionDateBeforeInitialDate')
  }

  // Initial date conflicts with existing transactions or closed period
  if (
    lower.includes('initial_date_conflict') ||
    lower.includes('predate this date') ||
    (lower.includes('initial date') && lower.includes('cannot be set')) ||
    (lower.includes('initial date') && lower.includes('before the closed period'))
  ) {
    return t('errors.initialDateConflict')
  }

  // Closed period
  if (lower.includes('closed period') || lower.includes('closed_period')) {
    return t('errors.closedPeriod')
  }

  // Duplicate transaction type name (must come before duplicateTransactionNumber)
  if (
    lower.includes('transaction type') &&
    lower.includes('name') &&
    (lower.includes('already exists') || lower.includes('duplicate'))
  ) {
    return t('errors.duplicateTransactionTypeName')
  }

  // Duplicate transaction number
  if (
    (lower.includes('duplicate') || lower.includes('already exists')) &&
    (lower.includes('transaction') || lower.includes('number'))
  ) {
    return t('errors.duplicateTransactionNumber')
  }

  // Duplicate account code
  if (
    lower.includes('duplicate') ||
    lower.includes('already exists') ||
    lower.includes('code already') ||
    lower.includes('unique constraint')
  ) {
    return t('errors.duplicateCode')
  }

  // Transaction not balanced
  if (
    lower.includes('not balanced') ||
    lower.includes('must equal') ||
    lower.includes('zero sum') ||
    lower.includes('debit') && lower.includes('credit') && lower.includes('equal')
  ) {
    return t('errors.transactionNotBalanced')
  }

  // Account not deletable (has transactions or children)
  if (
    (lower.includes('has transactions') || lower.includes('has children') || lower.includes('has child')) &&
    !lower.includes('third party') &&
    !lower.includes('thirdparty')
  ) {
    return t('errors.accountNotDeletable')
  }

  // Third party required (account needs one but none was provided)
  if (
    (lower.includes('third party') || lower.includes('thirdparty')) &&
    lower.includes('required')
  ) {
    return t('errors.thirdPartyRequired')
  }

  // Third party not found
  if (
    (lower.includes('third party') || lower.includes('thirdparty')) &&
    lower.includes('not found')
  ) {
    return t('errors.thirdPartyNotFound')
  }

  // Third party not deactivatable (has active transactions)
  if (
    lower.includes('third party') ||
    lower.includes('third-party') ||
    lower.includes('thirdparty') ||
    (lower.includes('has transactions') && lower.includes('balance'))
  ) {
    return t('errors.thirdPartyNotDeactivatable')
  }

  // Transaction type in use
  if (lower.includes('in use') || lower.includes('referenced by') || lower.includes('has_transactions')) {
    return t('errors.transactionTypeInUse')
  }

  // Generic server error (5xx)
  if (lower.includes('server error') || lower.includes('internal server') || lower.includes('500')) {
    return t('errors.serverError')
  }

  // Fallback: return the raw message (better than nothing, but shouldn't surface HTTP codes)
  return msg
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return ''
}

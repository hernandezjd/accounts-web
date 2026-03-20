import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { translateApiError } from './errorUtils'

const t = i18n.t.bind(i18n)

describe('translateApiError', () => {
  it('returns networkError for TypeError', () => {
    const err = new TypeError('Failed to fetch')
    expect(translateApiError(err, t)).toBe(t('errors.networkError'))
  })

  it('returns networkError for fetch failure message', () => {
    const err = new Error('failed to fetch')
    expect(translateApiError(err, t)).toBe(t('errors.networkError'))
  })

  it('returns networkError for network error message', () => {
    const err = new Error('Network error occurred')
    expect(translateApiError(err, t)).toBe(t('errors.networkError'))
  })

  it('returns lockedPeriod for locked period error', () => {
    const err = new Error('Date falls within locked period')
    expect(translateApiError(err, t)).toBe(t('errors.lockedPeriod'))
  })

  it('returns duplicateTransactionNumber for duplicate transaction number error', () => {
    const err = new Error('Transaction number already exists for this type')
    expect(translateApiError(err, t)).toBe(t('errors.duplicateTransactionNumber'))
  })

  it('returns duplicateTransactionTypeName for duplicate transaction type name error', () => {
    const err = new Error("A transaction type with name 'Income' already exists")
    expect(translateApiError(err, t)).toBe(t('errors.duplicateTransactionTypeName'))
  })

  it('returns duplicateCode for duplicate account code error', () => {
    const err = new Error('Account code already exists in this tenant')
    expect(translateApiError(err, t)).toBe(t('errors.duplicateCode'))
  })

  it('returns duplicateCode for unique constraint error', () => {
    const err = new Error('unique constraint violation')
    expect(translateApiError(err, t)).toBe(t('errors.duplicateCode'))
  })

  it('returns transactionNotBalanced for unbalanced transaction', () => {
    const err = new Error('Transaction items are not balanced')
    expect(translateApiError(err, t)).toBe(t('errors.transactionNotBalanced'))
  })

  it('returns accountNotDeletable for account with transactions', () => {
    const err = new Error('Account has transactions and cannot be deleted')
    expect(translateApiError(err, t)).toBe(t('errors.accountNotDeletable'))
  })

  it('returns accountNotDeletable for account with children', () => {
    const err = new Error('Account has children')
    expect(translateApiError(err, t)).toBe(t('errors.accountNotDeletable'))
  })

  it('returns thirdPartyRequired when third party is required but not provided', () => {
    const err = new Error("Third party ID is required for account '550e'")
    expect(translateApiError(err, t)).toBe(t('errors.thirdPartyRequired'))
  })

  it('returns thirdPartyNotFound when third party does not exist', () => {
    const err = new Error('Third party not found: 660e')
    expect(translateApiError(err, t)).toBe(t('errors.thirdPartyNotFound'))
  })

  it('returns thirdPartyNotDeactivatable for third party with active transactions', () => {
    const err = new Error('Cannot deactivate third-party: referenced by active transactions')
    expect(translateApiError(err, t)).toBe(t('errors.thirdPartyNotDeactivatable'))
  })

  it('returns transactionTypeInUse for type in use', () => {
    const err = new Error('Transaction type is in use by existing transactions')
    expect(translateApiError(err, t)).toBe(t('errors.transactionTypeInUse'))
  })

  it('returns serverError for 500 error', () => {
    const err = new Error('Internal server error 500')
    expect(translateApiError(err, t)).toBe(t('errors.serverError'))
  })

  it('returns unknownError for null', () => {
    expect(translateApiError(null, t)).toBe(t('errors.unknownError'))
  })

  it('returns unknownError for undefined', () => {
    expect(translateApiError(undefined, t)).toBe(t('errors.unknownError'))
  })

  it('returns string errors as-is when no pattern matches', () => {
    // An unrecognised message falls through to raw message
    const err = new Error('Some completely unknown error with no pattern')
    const result = translateApiError(err, t)
    expect(result).toBe('Some completely unknown error with no pattern')
  })
})

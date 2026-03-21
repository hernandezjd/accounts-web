/**
 * UI preferences storage keys and utilities.
 * Preferences are stored in localStorage and keyed by preference type.
 */

export const PREFERENCE_KEYS = {
  // Accounting page level filter
  ACCOUNTING_LEVEL: 'accounting.selectedLevel',
  // Accounting page period (granularity, from, to)
  ACCOUNTING_GRANULARITY: 'accounting.selectedGranularity',
  ACCOUNTING_PERIOD_FROM: 'accounting.selectedPeriodFrom',
  ACCOUNTING_PERIOD_TO: 'accounting.selectedPeriodTo',
  // Accounting page closure simulation toggle
  ACCOUNTING_SIMULATE_CLOSURE: 'accounting.simulateClosure',
  // Custom period types (saved period type definitions)
  ACCOUNTING_CUSTOM_PERIOD_TYPES: 'accounting.customPeriodTypes',
  // Transaction form last used date
  TRANSACTION_LAST_DATE: 'transaction.lastUsedDate',
} as const

/**
 * Clear all UI preferences (e.g., on logout or tenant switch).
 */
export function clearAllPreferences(): void {
  Object.values(PREFERENCE_KEYS).forEach((key) => {
    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      console.warn(`Error clearing preference key "${key}":`, error)
    }
  })
}

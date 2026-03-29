/**
 * Re-export from shared error-handling-web library
 *
 * This module re-exports all error code mapping utilities from the shared library
 * to maintain backward compatibility with existing imports in this project.
 */

export {
  ERROR_CODE_MAP,
  getErrorMessage,
  getErrorSuggestion,
  shouldShowSupportContact,
  type ErrorCodeMapping,
} from '@accounts/error-handling-web'

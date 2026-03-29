/**
 * Re-export from shared error-handling-web library
 *
 * This module re-exports all error handling utilities from the shared library
 * to maintain backward compatibility with existing imports in this project.
 */

export {
  formatError,
  parseErrorResponse,
  useErrorHandler,
  type FormattedError,
  type StructuredError,
} from '@accounts/error-handling-web'

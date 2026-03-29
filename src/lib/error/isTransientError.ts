/**
 * Re-export from shared error-handling-web library
 *
 * This module re-exports all error classification utilities from the shared library
 * to maintain backward compatibility with existing imports in this project.
 */

export {
  isTransientError,
  classifyError,
  type ErrorClassification,
} from '@accounts/error-handling-web'

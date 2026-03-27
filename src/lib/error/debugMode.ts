/**
 * Debug Mode Utility
 *
 * Provides utilities to detect and manage debug mode for the application.
 * Debug mode can be enabled via:
 * 1. URL query parameter: ?debug=true
 * 2. localStorage key: 'debug'
 *
 * When debug mode is active, additional debugging information (HTTP status,
 * request URL, response body) is captured and displayed in error messages.
 */

const DEBUG_STORAGE_KEY = 'debug'

/**
 * Check if debug mode is enabled.
 *
 * Debug mode is enabled if:
 * 1. URL has ?debug=true parameter (or ?debug with no value), OR
 * 2. localStorage has a 'debug' key with any value (presence check)
 *
 * URL parameter takes priority; if present, localStorage is ignored.
 *
 * @returns true if debug mode is active, false otherwise
 */
export function isDebugMode(): boolean {
  // Check URL params first
  const params = new URLSearchParams(window.location.search)
  if (params.has('debug')) {
    const debugValue = params.get('debug')

    // If no value provided (?debug or ?debug=), treat as true
    if (debugValue === '' || debugValue === null) {
      return true
    }

    const lowerValue = debugValue.toLowerCase()
    // Accept true, 1, yes
    if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
      return true
    }

    // Explicitly reject false, 0
    if (lowerValue === 'false' || lowerValue === '0') {
      return false
    }

    // Any other non-empty value is treated as true
    return lowerValue.length > 0
  }

  // Check localStorage as fallback
  try {
    const storageValue = localStorage.getItem(DEBUG_STORAGE_KEY)
    return storageValue !== null
  } catch {
    // localStorage might not be available in all contexts
    return false
  }
}

/**
 * Enable debug mode in localStorage.
 * Persists debug mode across page refreshes.
 */
export function enableDebugMode(): void {
  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, 'true')
  } catch {
    console.warn('Failed to enable debug mode in localStorage')
  }
}

/**
 * Disable debug mode in localStorage.
 */
export function disableDebugMode(): void {
  try {
    localStorage.removeItem(DEBUG_STORAGE_KEY)
  } catch {
    console.warn('Failed to disable debug mode in localStorage')
  }
}

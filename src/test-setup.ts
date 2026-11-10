import '@testing-library/jest-dom'
import { afterEach } from 'vitest'

// View state remembered per session must not leak between tests.
afterEach(() => {
  window.sessionStorage.clear()
})

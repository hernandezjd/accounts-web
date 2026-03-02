export type { ThemeSettings } from './themeTypes'
export { DEFAULT_THEME_SETTINGS, AVAILABLE_FONT_FAMILIES } from './themeTypes'
export { createAppTheme } from './themeFactory'

import { createAppTheme } from './themeFactory'
import { DEFAULT_THEME_SETTINGS } from './themeTypes'

// Default static theme for non-tenant routes (login, tenant picker)
export const theme = createAppTheme(DEFAULT_THEME_SETTINGS)

export type ThemeMode = 'light' | 'dark'

export interface ThemeSettings {
  palette: {
    primaryMain: string
    secondaryMain: string
    errorMain: string
    warningMain: string
    successMain: string
    infoMain: string
  }
  typography: {
    fontFamily: string
    fontSizeBase: number
  }
  shape: {
    borderRadiusSubtle: number
    borderRadiusStandard: number
    borderRadiusLarge: number
  }
  spacing: {
    unit: number
  }
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  palette: {
    primaryMain: '#1976d2',
    secondaryMain: '#9c27b0',
    errorMain: '#d32f2f',
    warningMain: '#ed6c02',
    successMain: '#2e7d32',
    infoMain: '#0288d1',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSizeBase: 14,
  },
  shape: {
    borderRadiusSubtle: 4,
    borderRadiusStandard: 8,
    borderRadiusLarge: 12,
  },
  spacing: {
    unit: 8,
  },
}

export const AVAILABLE_FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Roboto', value: '"Roboto", "Helvetica", "Arial", sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
]

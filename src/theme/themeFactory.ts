import { createTheme, type Theme } from '@mui/material/styles'
import type { ThemeSettings } from './themeTypes'

export function createAppTheme(settings: ThemeSettings): Theme {
  return createTheme({
    palette: {
      primary: { main: settings.palette.primaryMain },
      secondary: { main: settings.palette.secondaryMain },
      error: { main: settings.palette.errorMain },
      warning: { main: settings.palette.warningMain },
      success: { main: settings.palette.successMain },
      info: { main: settings.palette.infoMain },
    },
    typography: {
      fontFamily: settings.typography.fontFamily,
      fontSize: settings.typography.fontSizeBase,
    },
    shape: {
      borderRadius: settings.shape.borderRadiusStandard,
    },
    spacing: settings.spacing.unit,
    components: {
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: settings.shape.borderRadiusSubtle },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: settings.shape.borderRadiusLarge },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { borderRadius: settings.shape.borderRadiusLarge },
        },
      },
    },
    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },
  })
}

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
      MuiDialogContent: {
        styleOverrides: {
          root: {
            // MUI injects `.MuiDialogTitle-root + .MuiDialogContent-root { padding-top: 0 }`
            // (specificity 0,2,0), which clips the floating label of the first outlined
            // TextField. The `&&` selector (0,2,0) injected after the component styles
            // wins via cascade order and restores the clearance the label needs.
            '&&': { paddingTop: '20px' },
          },
        },
      },
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

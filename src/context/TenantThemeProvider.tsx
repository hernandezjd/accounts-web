import { useMemo, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import GlobalStyles from '@mui/material/GlobalStyles'
import { createAppTheme } from '@/theme'
import { useThemeStore } from '@/store/themeStore'

interface TenantThemeProviderProps {
  children: ReactNode
}

export function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  const { tenantId = '' } = useParams<{ tenantId: string }>()
  const getThemeForTenant = useThemeStore((s) => s.getThemeForTenant)
  const settings = useThemeStore((s) => s.themesByTenant[tenantId])

  const effectiveSettings = settings ?? getThemeForTenant(tenantId)
  const theme = useMemo(() => createAppTheme(effectiveSettings), [effectiveSettings])

  const cssVars = {
    '--pa-color-primary': effectiveSettings.palette.primaryMain,
    '--pa-color-secondary': effectiveSettings.palette.secondaryMain,
    '--pa-color-error': effectiveSettings.palette.errorMain,
    '--pa-color-warning': effectiveSettings.palette.warningMain,
    '--pa-color-success': effectiveSettings.palette.successMain,
    '--pa-color-info': effectiveSettings.palette.infoMain,
    '--pa-font-family': effectiveSettings.typography.fontFamily,
    '--pa-font-size-base': `${effectiveSettings.typography.fontSizeBase}px`,
    '--pa-spacing-unit': `${effectiveSettings.spacing.unit}px`,
    '--pa-border-radius-subtle': `${effectiveSettings.shape.borderRadiusSubtle}px`,
    '--pa-border-radius-standard': `${effectiveSettings.shape.borderRadiusStandard}px`,
    '--pa-border-radius-large': `${effectiveSettings.shape.borderRadiusLarge}px`,
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{ ':root': cssVars }} />
      {children}
    </ThemeProvider>
  )
}

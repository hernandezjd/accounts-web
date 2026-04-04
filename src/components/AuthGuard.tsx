import { useAuth } from 'react-oidc-context'
import type { ReactNode } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

/**
 * AuthGuard Component
 *
 * Protects routes that require authentication.
 * If the user is not authenticated, redirects to the login page.
 * Shows a loading spinner while authentication state is being determined.
 *
 * Usage:
 *   <AuthGuard>
 *     <ProtectedPage />
 *   </AuthGuard>
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth()

  // Still loading auth state
  if (auth.isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress />
      </Box>
    )
  }

  // Auth error - show message instead of blank page
  if (auth.error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <pre style={{ color: 'red' }}>{auth.error.message}</pre>
      </Box>
    )
  }

  // Not authenticated - redirect to login
  if (!auth.isAuthenticated) {
    auth.signinRedirect().catch((err) => console.error('signinRedirect failed:', err))
    return null
  }

  // Authenticated - render protected content
  return <>{children}</>
}

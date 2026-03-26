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

  // Not authenticated - redirect to login
  if (!auth.isAuthenticated) {
    auth.signinRedirect()
    return null
  }

  // Authenticated - render protected content
  return <>{children}</>
}

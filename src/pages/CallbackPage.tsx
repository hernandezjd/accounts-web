import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

/**
 * CallbackPage
 *
 * Handles the OAuth 2.0 callback after user logs in at user-service.
 * The OAuth provider (user-service) redirects here with an authorization code,
 * which react-oidc-context exchanges for an access token.
 *
 * Once authentication completes AND the token is stored in localStorage,
 * redirect to the workspace picker page. This ensures API calls after
 * redirect have access to the Bearer token.
 */
export function CallbackPage() {
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    // Wait for both auth completion AND token storage before redirecting.
    // This prevents a race condition where the redirect happens before
    // onSigninCallback has stored the token in localStorage.
    if (!auth.isAuthenticated) {
      return
    }

    const token = localStorage.getItem('access_token')
    if (token) {
      // Token is ready; navigate to workspace picker
      navigate('/', { replace: true })
      return
    }

    // Token not yet stored; check again after a brief delay.
    // This should rarely happen as onSigninCallback typically runs synchronously,
    // but we guard against timing issues.
    const timer = setTimeout(() => {
      const delayedToken = localStorage.getItem('access_token')
      if (delayedToken) {
        navigate('/', { replace: true })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [auth.isAuthenticated, navigate])

  // If there was an error during callback processing
  if (auth.error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            Authentication Error
          </Typography>
          <Typography variant="body2">
            {auth.error.message || 'An error occurred during login. Please try again.'}
          </Typography>
        </Alert>
      </Box>
    )
  }

  // Show loading spinner while processing callback
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Completing login...
        </Typography>
      </Box>
    </Box>
  )
}

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
 * Once authentication completes, redirect to the tenant picker page.
 */
export function CallbackPage() {
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    // If authentication is complete and successful, redirect to tenant picker
    if (auth.isAuthenticated) {
      navigate('/', { replace: true })
    }
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

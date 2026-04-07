import Box from '@mui/material/Box'
import { useServiceVersion } from '@/hooks/useServiceVersion'

export function VersionFooter() {
  const { versionInfo, loading, error } = useServiceVersion()

  if (loading || !versionInfo || error) {
    return null
  }

  return (
    <Box
      sx={{
        padding: '8px 12px',
        fontSize: '0.75rem',
        color: 'text.secondary',
        borderTop: '1px solid',
        borderColor: 'divider',
        marginTop: 'auto',
        textAlign: 'center',
      }}
    >
      {versionInfo.serviceName} v{versionInfo.version} ({versionInfo.commitHash})
    </Box>
  )
}

/**
 * ErrorMessage Component
 *
 * Displays formatted error messages with context and support information.
 * Can be used in error boundaries, dialogs, or inline error displays.
 * This component is reusable across the application.
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningIcon from '@mui/icons-material/Warning';
import { FormattedError } from '../../lib/error/useErrorHandler';

export interface ErrorMessageProps {
  error: FormattedError | null;
  onDismiss?: () => void;
  showRequestId?: boolean;
  variant?: 'standard' | 'filled' | 'outlined';
  severity?: 'error' | 'warning';
}

/**
 * ErrorMessage component for displaying structured errors.
 * Shows user-friendly message, suggestions, and support contact info.
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
  showRequestId = true,
  variant = 'filled',
  severity = 'error',
}) => {
  if (!error) {
    return null;
  }

  const icon = severity === 'error' ? <ErrorOutlineIcon /> : <WarningIcon />;

  return (
    <Collapse in={true}>
      <Alert
        severity={severity}
        icon={icon}
        variant={variant}
        sx={{ mb: 2 }}
        action={
          onDismiss && (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={onDismiss}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          )
        }
      >
        <Stack spacing={1}>
          <AlertTitle>{error.userMessage}</AlertTitle>

          {/* Show suggestion if available */}
          {error.suggestion && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>What you can try:</strong> {error.suggestion}
            </Typography>
          )}

          {/* Show context details if available */}
          {error.rawDetails && Object.keys(error.rawDetails).length > 0 && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0, 0, 0, 0.1)', borderRadius: 1 }}>
              <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Details:
              </Typography>
              {Object.entries(error.rawDetails).map(([key, value]) => (
                <Typography key={key} variant="caption" component="div" sx={{ ml: 1 }}>
                  <strong>{key}:</strong> {formatDetailValue(value)}
                </Typography>
              ))}
            </Box>
          )}

          {/* Show request ID for support */}
          {showRequestId && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
              <Typography variant="caption" component="div">
                <strong>Request ID:</strong>{' '}
                <code style={{ wordBreak: 'break-all' }}>{error.requestId}</code>
              </Typography>
            </Box>
          )}

          {/* Show support contact link if applicable */}
          {error.showSupportContact && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                If this problem persists, please{' '}
                <Button
                  size="small"
                  color="inherit"
                  href={`mailto:support@example.com?subject=Error%20Support&body=Request%20ID:%20${error.requestId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textDecoration: 'underline', fontWeight: 'bold' }}
                >
                  contact support
                </Button>{' '}
                with your request ID.
              </Typography>
            </Box>
          )}
        </Stack>
      </Alert>
    </Collapse>
  );
};

/**
 * Format detail values for display.
 * Handles various data types (strings, dates, objects, etc.)
 */
function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

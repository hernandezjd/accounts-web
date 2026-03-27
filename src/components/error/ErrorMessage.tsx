/**
 * ErrorMessage Component
 *
 * Displays formatted error messages with context and support information.
 * Can be used in error boundaries, dialogs, or inline error displays.
 * This component is reusable across the application.
 *
 * Features:
 * - Conditional retry button (only for transient errors)
 * - Request ID display with copy-to-clipboard for 5xx errors
 * - Error-type-specific messaging
 * - Support contact information for permanent errors
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningIcon from '@mui/icons-material/Warning';
import { FormattedError } from '../../lib/error/useErrorHandler';

export interface ErrorMessageProps {
  error: FormattedError | null;
  onDismiss?: () => void;
  onRetry?: () => void | Promise<void>;
  showRequestId?: boolean;
  variant?: 'standard' | 'filled' | 'outlined';
  severity?: 'error' | 'warning';
}

/**
 * ErrorMessage component for displaying structured errors.
 * Shows user-friendly message, suggestions, and support contact info.
 * Features:
 * - Conditional retry button based on error classification
 * - Copy-to-clipboard for request IDs
 * - Error-type-specific messaging
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
  onRetry,
  showRequestId = true,
  variant = 'filled',
  severity = 'error',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!error) {
    return null;
  }

  const icon = severity === 'error' ? <ErrorOutlineIcon /> : <WarningIcon />;
  const isRetryable = error.isRetryable && onRetry !== undefined;

  const handleCopyRequestId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(error.requestId);
      setCopiedId(error.requestId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy request ID:', err);
    }
  }, [error.requestId]);

  // Determine if this is a 5xx error (for request ID prominence)
  const is5xxError = (error.errorCode?.startsWith('HTTP_5') ?? false) ||
                      error.errorCode === 'INTERNAL_SERVER_ERROR';

  // Determine if this is a 403 Forbidden error (hide request ID and debug info for permission errors)
  const is403Error = error.errorCode === 'FORBIDDEN' || error.errorCode === 'HTTP_403';

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

          {/* Show suggestion only for retryable errors */}
          {error.suggestion && error.isRetryable && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>What you can try:</strong> {error.suggestion}
            </Typography>
          )}

          {/* Show context details if available */}
          {error.rawDetails && Object.keys(error.rawDetails).length > 0 && (
            <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 1 }}>
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

          {/* Show request ID prominently for 5xx errors with copy button (not for 403) */}
          {showRequestId && is5xxError && !is403Error && (
            <Box sx={{
              mt: 1,
              p: 1.5,
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              borderRadius: 1,
              border: '1px solid rgba(0, 0, 0, 0.2)',
            }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Request ID:
                  </Typography>
                  <code style={{
                    wordBreak: 'break-all',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                  }}>
                    {error.requestId}
                  </code>
                </Box>
                <Tooltip title={copiedId === error.requestId ? 'Copied!' : 'Copy'}>
                  <IconButton
                    size="small"
                    onClick={handleCopyRequestId}
                    sx={{
                      color: 'inherit',
                      opacity: 0.7,
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          )}

          {/* Show request ID for other errors (except 403) */}
          {showRequestId && !is5xxError && !is403Error && (
            <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
              <Typography variant="caption" component="div">
                <strong>Request ID:</strong>{' '}
                <code style={{ wordBreak: 'break-all' }}>{error.requestId}</code>
              </Typography>
            </Box>
          )}

          {/* Show support contact link if applicable */}
          {error.showSupportContact && is5xxError && (
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
                with the request ID above.
              </Typography>
            </Box>
          )}

          {/* Show retry button only for retryable errors */}
          {isRetryable && (
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={onRetry}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Try Again
              </Button>
            </Box>
          )}

          {/* Show debug information if available (except for 403 permission errors) */}
          {!is403Error && (error.httpStatus !== undefined || error.requestUrl || error.responseBody) && (
            <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(0, 0, 0, 0.08)', borderRadius: 1, border: '1px solid rgba(0, 0, 0, 0.15)' }}>
              <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', mb: 1, color: 'inherit' }}>
                DEBUG
              </Typography>

              {/* HTTP Status */}
              {error.httpStatus !== undefined && (
                <Typography variant="caption" component="div" sx={{ ml: 1, mb: 0.5 }}>
                  <strong>HTTP Status:</strong> {error.httpStatus === 0 ? '0 (network/CORS error — no response received)' : error.httpStatus}
                </Typography>
              )}

              {/* Request URL */}
              {error.requestUrl && (
                <Box sx={{ ml: 1, mb: 0.5 }}>
                  <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', mb: 0.25 }}>
                    Request URL:
                  </Typography>
                  <code style={{
                    wordBreak: 'break-all',
                    fontSize: '0.75rem',
                    display: 'block',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    borderRadius: '2px',
                  }}>
                    {error.requestUrl}
                  </code>
                </Box>
              )}

              {/* Response Body */}
              {error.responseBody && (
                <Box sx={{ ml: 1 }}>
                  <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', mb: 0.25 }}>
                    Response Body:
                  </Typography>
                  <Box sx={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    borderRadius: '2px',
                    p: 1,
                  }}>
                    <code style={{
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.75rem',
                      display: 'block',
                    }}>
                      {formatResponseBody(error.responseBody)}
                    </code>
                  </Box>
                </Box>
              )}
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

/**
 * Format response body for display.
 * Attempts to prettify JSON; falls back to raw text if not valid JSON.
 */
function formatResponseBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Not valid JSON, return as-is
    return body;
  }
}

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import { useExternalReportData, ExternalReportDataRequest } from '../hooks/useExternalReportData';
import { getExternalDataConfig, requiresExternalData } from '../utils/reportExternalDataConfig';

interface ExternalReportDataFormProps {
  workspaceId: string;
  reportType: string;
  periodStartDate: string;
  periodEndDate: string;
}

export const ExternalReportDataForm: React.FC<ExternalReportDataFormProps> = ({
  workspaceId,
  reportType,
  periodStartDate,
  periodEndDate,
}) => {
  const { data, isLoading, error, addData, updateData, isAdding, isUpdating } =
    useExternalReportData(
      workspaceId,
      reportType,
      periodStartDate,
      periodEndDate
    );

  const config = useMemo(() => getExternalDataConfig(reportType), [reportType]);
  const hasExternalData = useMemo(() => requiresExternalData(reportType), [reportType]);

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config.fields.forEach((field) => {
      const existing = data.find((d) => d.dataKey === field.key);
      initial[field.key] = existing?.dataValue || '';
    });
    return initial;
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!hasExternalData) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="External Data" />
        <CardContent>
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const handleChange = (fieldKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      for (const field of config.fields) {
        const value = formData[field.key] || '';
        if (field.required && !value.trim()) {
          setSubmitError(`${field.label} is required`);
          return;
        }

        const request: ExternalReportDataRequest = {
          reportType,
          periodStartDate,
          periodEndDate,
          dataKey: field.key,
          dataValue: value,
        };

        const existing = data.find((d) => d.dataKey === field.key);
        if (existing) {
          updateData(request);
        } else {
          addData(request);
        }
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save external data');
    }
  };

  const lastUpdated = data.length > 0 ? new Date(data[0].updatedAt) : null;

  return (
    <Card>
      <CardHeader
        title="External Data"
        subheader={
          lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleDateString()} ${lastUpdated.toLocaleTimeString()}`
            : 'No data yet'
        }
      />
      <CardContent>
        {error && <Alert severity="error">Failed to load external data</Alert>}
        {submitError && <Alert severity="error">{submitError}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {config.fields.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                type={field.type === 'number' ? 'number' : 'text'}
                value={formData[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                helperText={field.helpText}
                fullWidth
                required={field.required}
                disabled={isAdding || isUpdating}
                multiline={field.type === 'textarea'}
                rows={field.type === 'textarea' ? 4 : 1}
              />
            ))}

            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                disabled={isAdding || isUpdating}
              >
                {isAdding || isUpdating ? <CircularProgress size={24} /> : 'Save'}
              </Button>
            </Box>
          </Stack>
        </form>

        {data.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Current values:
            </Typography>
            <Stack spacing={1} mt={1}>
              {data.map((item) => (
                <Typography key={item.dataKey} variant="body2">
                  <strong>{item.dataKey}:</strong> {item.dataValue}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

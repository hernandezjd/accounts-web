export type ExternalDataFieldType = 'text' | 'number' | 'date' | 'textarea';

export interface ExternalDataField {
  key: string;
  label: string;
  type: ExternalDataFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface ReportExternalDataConfig {
  fields: ExternalDataField[];
}

type ReportType = string;

export const reportExternalDataConfig: Record<ReportType, ReportExternalDataConfig> = {
  GENERAL_JOURNAL: {
    fields: [],
  },
  PERIOD_REPORT: {
    fields: [
      {
        key: 'lastInventoryCount',
        label: 'Last Inventory Count',
        type: 'number',
        required: true,
        placeholder: '0.00',
        helpText: 'The inventory count as of the last day of the period',
      },
      {
        key: 'physicalCashCount',
        label: 'Physical Cash Count',
        type: 'number',
        required: false,
        placeholder: '0.00',
        helpText: 'The actual cash count from a physical count',
      },
    ],
  },
  BALANCE_AT_DATE: {
    fields: [],
  },
  BALANCE_AT_LEVEL: {
    fields: [],
  },
};

export function getExternalDataConfig(reportType: ReportType): ReportExternalDataConfig {
  return reportExternalDataConfig[reportType] || { fields: [] };
}

export function requiresExternalData(reportType: ReportType): boolean {
  const config = getExternalDataConfig(reportType);
  return config.fields.length > 0;
}

export function getRequiredFields(reportType: ReportType): string[] {
  const config = getExternalDataConfig(reportType);
  return config.fields.filter((f) => f.required).map((f) => f.key);
}

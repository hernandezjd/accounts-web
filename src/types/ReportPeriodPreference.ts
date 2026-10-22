export type PeriodType = 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM' | 'AS_OF_DATE';

export interface ReportPeriodPreference {
  reportType: string;
  periodType: PeriodType;
  periodStart?: string; // ISO date string (YYYY-MM-DD)
  periodEnd?: string; // ISO date string (YYYY-MM-DD)
  customDate?: string; // ISO date string for AS_OF_DATE
}

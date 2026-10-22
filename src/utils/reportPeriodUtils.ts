import { ReportPeriodPreference, PeriodType } from '../types/ReportPeriodPreference';

export function getMonthlyPeriod(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getQuarterlyPeriod(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const quarter = Math.floor(month / 3);

  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, (quarter + 1) * 3, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getYearlyPeriod(date: Date): { start: string; end: string } {
  const year = date.getFullYear();

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function parseISODate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatPeriodForDisplay(preference: ReportPeriodPreference): string {
  const { periodType, periodStart, periodEnd, customDate } = preference;

  const needsEndDate = periodType !== 'AS_OF_DATE';
  if (!periodStart || (needsEndDate && !periodEnd)) {
    return periodType;
  }

  const startDate = parseISODate(periodStart);
  const endDate = periodEnd ? parseISODate(periodEnd) : startDate;

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  switch (periodType) {
    case 'MONTH':
      return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    case 'QUARTER': {
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${quarter} ${startDate.getFullYear()}`;
    }
    case 'YEAR':
      return startDate.getFullYear().toString();
    case 'CUSTOM':
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    case 'AS_OF_DATE': {
      const date = customDate ? parseISODate(customDate) : startDate;
      return `As of ${formatDate(date)}`;
    }
    default:
      return periodType;
  }
}

export function getPeriodTypeLabel(periodType: PeriodType): string {
  const labels: Record<PeriodType, string> = {
    MONTH: 'This Month',
    QUARTER: 'This Quarter',
    YEAR: 'This Year',
    CUSTOM: 'Custom Period',
    AS_OF_DATE: 'As of Date',
  };
  return labels[periodType];
}

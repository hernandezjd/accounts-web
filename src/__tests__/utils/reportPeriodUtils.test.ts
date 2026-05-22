import { describe, it, expect } from 'vitest';
import {
  getMonthlyPeriod,
  getQuarterlyPeriod,
  getYearlyPeriod,
  formatPeriodForDisplay,
  getPeriodTypeLabel,
} from '../../utils/reportPeriodUtils';
import { ReportPeriodPreference } from '../../types/ReportPeriodPreference';

describe('reportPeriodUtils', () => {
  describe('getMonthlyPeriod', () => {
    it('should return the first and last day of the month', () => {
      const date = new Date(2025, 5, 15); // June 15, 2025
      const { start, end } = getMonthlyPeriod(date);

      expect(start).toBe('2025-06-01');
      expect(end).toBe('2025-06-30');
    });

    it('should handle edge case: February in non-leap year', () => {
      const date = new Date(2025, 1, 10); // February 10, 2025
      const { start, end } = getMonthlyPeriod(date);

      expect(start).toBe('2025-02-01');
      expect(end).toBe('2025-02-28');
    });

    it('should handle edge case: February in leap year', () => {
      const date = new Date(2024, 1, 10); // February 10, 2024
      const { start, end } = getMonthlyPeriod(date);

      expect(start).toBe('2024-02-01');
      expect(end).toBe('2024-02-29');
    });

    it('should handle December', () => {
      const date = new Date(2025, 11, 25); // December 25, 2025
      const { start, end } = getMonthlyPeriod(date);

      expect(start).toBe('2025-12-01');
      expect(end).toBe('2025-12-31');
    });
  });

  describe('getQuarterlyPeriod', () => {
    it('should return Q1 period for January', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const { start, end } = getQuarterlyPeriod(date);

      expect(start).toBe('2025-01-01');
      expect(end).toBe('2025-03-31');
    });

    it('should return Q2 period for May', () => {
      const date = new Date(2025, 4, 15); // May 15, 2025
      const { start, end } = getQuarterlyPeriod(date);

      expect(start).toBe('2025-04-01');
      expect(end).toBe('2025-06-30');
    });

    it('should return Q3 period for August', () => {
      const date = new Date(2025, 7, 15); // August 15, 2025
      const { start, end } = getQuarterlyPeriod(date);

      expect(start).toBe('2025-07-01');
      expect(end).toBe('2025-09-30');
    });

    it('should return Q4 period for December', () => {
      const date = new Date(2025, 11, 15); // December 15, 2025
      const { start, end } = getQuarterlyPeriod(date);

      expect(start).toBe('2025-10-01');
      expect(end).toBe('2025-12-31');
    });
  });

  describe('getYearlyPeriod', () => {
    it('should return January 1 to December 31', () => {
      const date = new Date(2025, 5, 15); // June 15, 2025
      const { start, end } = getYearlyPeriod(date);

      expect(start).toBe('2025-01-01');
      expect(end).toBe('2025-12-31');
    });

    it('should work for different years', () => {
      const date = new Date(2024, 0, 1); // January 1, 2024
      const { start, end } = getYearlyPeriod(date);

      expect(start).toBe('2024-01-01');
      expect(end).toBe('2024-12-31');
    });
  });

  describe('formatPeriodForDisplay', () => {
    it('should format MONTH period', () => {
      const preference: ReportPeriodPreference = {
        reportType: 'GJ',
        periodType: 'MONTH',
        periodStart: '2025-06-01',
        periodEnd: '2025-06-30',
      };

      const result = formatPeriodForDisplay(preference);
      expect(result).toContain('June');
      expect(result).toContain('2025');
    });

    it('should format QUARTER period', () => {
      const preference: ReportPeriodPreference = {
        reportType: 'GJ',
        periodType: 'QUARTER',
        periodStart: '2025-04-01',
        periodEnd: '2025-06-30',
      };

      const result = formatPeriodForDisplay(preference);
      expect(result).toContain('Q2');
      expect(result).toContain('2025');
    });

    it('should format YEAR period', () => {
      const preference: ReportPeriodPreference = {
        reportType: 'GJ',
        periodType: 'YEAR',
        periodStart: '2025-01-01',
        periodEnd: '2025-12-31',
      };

      const result = formatPeriodForDisplay(preference);
      expect(result).toBe('2025');
    });

    it('should format CUSTOM period', () => {
      const preference: ReportPeriodPreference = {
        reportType: 'GJ',
        periodType: 'CUSTOM',
        periodStart: '2025-03-01',
        periodEnd: '2025-05-31',
      };

      const result = formatPeriodForDisplay(preference);
      expect(result).toContain('Mar');
      expect(result).toContain('May');
    });

    it('should format AS_OF_DATE period', () => {
      const preference: ReportPeriodPreference = {
        reportType: 'GJ',
        periodType: 'AS_OF_DATE',
        periodStart: '2025-06-15',
        customDate: '2025-06-15',
        periodEnd: '2025-06-15',
      };

      const result = formatPeriodForDisplay(preference);
      expect(result).toContain('As of');
      expect(result).toContain('Jun');
    });
  });

  describe('getPeriodTypeLabel', () => {
    it('should return correct labels for all period types', () => {
      expect(getPeriodTypeLabel('MONTH')).toBe('This Month');
      expect(getPeriodTypeLabel('QUARTER')).toBe('This Quarter');
      expect(getPeriodTypeLabel('YEAR')).toBe('This Year');
      expect(getPeriodTypeLabel('CUSTOM')).toBe('Custom Period');
      expect(getPeriodTypeLabel('AS_OF_DATE')).toBe('As of Date');
    });
  });
});

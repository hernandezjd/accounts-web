import { useEffect, useState } from 'react';
import type { ReportPeriodPreference } from '../types/ReportPeriodPreference';
import {
  getMonthlyPeriod,
  getQuarterlyPeriod,
  getYearlyPeriod,
} from '../utils/reportPeriodUtils';

const STORAGE_KEY_PREFIX = 'reportPeriodPreference';

function getStorageKey(workspaceId: string, reportType: string): string {
  return `${STORAGE_KEY_PREFIX}:${workspaceId}:${reportType}`;
}

function getDefaultPreference(reportType: string): ReportPeriodPreference {
  const today = new Date();
  const monthlyPeriod = getMonthlyPeriod(today);

  return {
    reportType,
    periodType: 'MONTH',
    periodStart: monthlyPeriod.start,
    periodEnd: monthlyPeriod.end,
  };
}

export function useReportPeriodPreference(
  workspaceId: string,
  reportType: string
): {
  preference: ReportPeriodPreference;
  updatePreference: (newPreference: Partial<ReportPeriodPreference>) => void;
  setToThisMonth: () => void;
  setToThisQuarter: () => void;
  setToThisYear: () => void;
  setToAsOfDate: (date: string) => void;
  setToCustomPeriod: (start: string, end: string) => void;
  clearPreference: () => void;
} {
  const [preference, setPreference] = useState<ReportPeriodPreference>(() => {
    if (typeof window === 'undefined') {
      return getDefaultPreference(reportType);
    }

    try {
      const storageKey = getStorageKey(workspaceId, reportType);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load report period preference from localStorage:', error);
    }

    return getDefaultPreference(reportType);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = getStorageKey(workspaceId, reportType);
      localStorage.setItem(storageKey, JSON.stringify(preference));
    } catch (error) {
      console.warn('Failed to save report period preference to localStorage:', error);
    }
  }, [preference, workspaceId, reportType]);

  const updatePreference = (newPreference: Partial<ReportPeriodPreference>) => {
    setPreference((prev) => ({
      ...prev,
      ...newPreference,
    }));
  };

  const setToThisMonth = () => {
    const today = new Date();
    const monthlyPeriod = getMonthlyPeriod(today);
    updatePreference({
      periodType: 'MONTH',
      periodStart: monthlyPeriod.start,
      periodEnd: monthlyPeriod.end,
    });
  };

  const setToThisQuarter = () => {
    const today = new Date();
    const quarterlyPeriod = getQuarterlyPeriod(today);
    updatePreference({
      periodType: 'QUARTER',
      periodStart: quarterlyPeriod.start,
      periodEnd: quarterlyPeriod.end,
    });
  };

  const setToThisYear = () => {
    const today = new Date();
    const yearlyPeriod = getYearlyPeriod(today);
    updatePreference({
      periodType: 'YEAR',
      periodStart: yearlyPeriod.start,
      periodEnd: yearlyPeriod.end,
    });
  };

  const setToAsOfDate = (date: string) => {
    updatePreference({
      periodType: 'AS_OF_DATE',
      customDate: date,
      periodStart: date,
    });
  };

  const setToCustomPeriod = (start: string, end: string) => {
    updatePreference({
      periodType: 'CUSTOM',
      periodStart: start,
      periodEnd: end,
    });
  };

  const clearPreference = () => {
    if (typeof window === 'undefined') return;

    try {
      setPreference(getDefaultPreference(reportType));
      const storageKey = getStorageKey(workspaceId, reportType);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear report period preference:', error);
    }
  };

  return {
    preference,
    updatePreference,
    setToThisMonth,
    setToThisQuarter,
    setToThisYear,
    setToAsOfDate,
    setToCustomPeriod,
    clearPreference,
  };
}

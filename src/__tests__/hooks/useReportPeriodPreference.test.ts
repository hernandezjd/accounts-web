import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReportPeriodPreference } from '../../hooks/useReportPeriodPreference';

describe('useReportPeriodPreference', () => {
  const workspaceId = 'test-workspace-123';
  const reportType = 'GENERAL_JOURNAL';
  const storageKey = `reportPeriodPreference:${workspaceId}:${reportType}`;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should load default preference on initial mount', () => {
    const { result } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );

    expect(result.current.preference.reportType).toBe(reportType);
    expect(result.current.preference.periodType).toBe('MONTH');
    expect(result.current.preference.periodStart).toBeDefined();
    expect(result.current.preference.periodEnd).toBeDefined();
  });

  it('should save preference to localStorage on update', () => {
    const { result } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );

    act(() => {
      result.current.setToThisQuarter();
    });

    const stored = localStorage.getItem(storageKey);
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored!);
    expect(parsed.periodType).toBe('QUARTER');
  });

  it('should load preference from localStorage on mount', () => {
    const savedPreference = {
      reportType,
      periodType: 'YEAR' as const,
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
    };
    localStorage.setItem(storageKey, JSON.stringify(savedPreference));

    const { result } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );

    expect(result.current.preference.periodType).toBe('YEAR');
    expect(result.current.preference.periodStart).toBe('2025-01-01');
    expect(result.current.preference.periodEnd).toBe('2025-12-31');
  });

  it('should update preference with updatePreference method', () => {
    const { result } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );

    act(() => {
      result.current.updatePreference({
        periodType: 'CUSTOM',
        periodStart: '2025-06-01',
        periodEnd: '2025-06-30',
      });
    });

    expect(result.current.preference.periodType).toBe('CUSTOM');
    expect(result.current.preference.periodStart).toBe('2025-06-01');
    expect(result.current.preference.periodEnd).toBe('2025-06-30');
  });

  it('should set to this month', () => {
    const { result } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );

    act(() => {
      result.current.setToThisMonth();
    });

    expect(result.current.preference.periodType).toBe('MONTH');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    expect(result.current.preference.periodStart).toBe(
      firstDay.toISOString().split('T')[0]
    );
    expect(result.current.preference.periodEnd).toBe(
      lastDay.toISOString().split('T')[0]
    );
  });

  it('should set to as of date', () => {
    const { result } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );

    act(() => {
      result.current.setToAsOfDate('2025-06-15');
    });

    expect(result.current.preference.periodType).toBe('AS_OF_DATE');
    expect(result.current.preference.customDate).toBe('2025-06-15');
    expect(result.current.preference.periodStart).toBe('2025-06-15');
  });

  it('should set to custom period', () => {
    const { result } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );

    act(() => {
      result.current.setToCustomPeriod('2025-03-01', '2025-05-31');
    });

    expect(result.current.preference.periodType).toBe('CUSTOM');
    expect(result.current.preference.periodStart).toBe('2025-03-01');
    expect(result.current.preference.periodEnd).toBe('2025-05-31');
  });

  it('should clear preference and reset to default', () => {
    const savedPreference = {
      reportType,
      periodType: 'YEAR' as const,
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
    };
    localStorage.setItem(storageKey, JSON.stringify(savedPreference));

    const { result } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );

    expect(result.current.preference.periodType).toBe('YEAR');

    act(() => {
      result.current.clearPreference();
    });

    expect(result.current.preference.periodType).toBe('MONTH');
  });

  it('should use separate storage per workspace and report type', () => {
    const workspace2Id = 'test-workspace-456';
    const reportType2 = 'BALANCE_SHEET';

    const { result: result1 } = renderHook(() =>
      useReportPeriodPreference(workspaceId, reportType)
    );
    const { result: result2 } = renderHook(() =>
      useReportPeriodPreference(workspace2Id, reportType2)
    );

    act(() => {
      result1.current.setToThisYear();
    });

    expect(result2.current.preference.periodType).toBe('MONTH');
    expect(result1.current.preference.periodType).toBe('YEAR');
  });
});

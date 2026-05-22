import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExternalReportDataForm } from './ExternalReportDataForm';
import { useExternalReportData } from '../hooks/useExternalReportData';
import * as reportExternalDataConfig from '../utils/reportExternalDataConfig';

vi.mock('../hooks/useExternalReportData');
vi.mock('../utils/reportExternalDataConfig');

describe('ExternalReportDataForm', () => {
  const mockAddData = vi.fn();
  const mockUpdateData = vi.fn();
  const defaultProps = {
    workspaceId: 'test-workspace-123',
    reportType: 'PERIOD_REPORT',
    periodStartDate: '2025-01-01',
    periodEndDate: '2025-01-31',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useExternalReportData as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: vi.fn(),
      isAdding: false,
      isUpdating: false,
      isDeleting: false,
    });

    (reportExternalDataConfig.getExternalDataConfig as any).mockReturnValue({
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
    });

    (reportExternalDataConfig.requiresExternalData as any).mockReturnValue(true);
  });

  it('should render the form with external data fields', () => {
    render(<ExternalReportDataForm {...defaultProps} />);

    expect(screen.getByText('External Data')).toBeInTheDocument();
    const spinbuttons = screen.getAllByRole('spinbutton');
    expect(spinbuttons.length).toBeGreaterThan(0);
  });

  it('should return null when report type does not require external data', () => {
    (reportExternalDataConfig.requiresExternalData as any).mockReturnValue(false);

    const { container } = render(<ExternalReportDataForm {...defaultProps} />);

    expect(container.firstChild).toBeNull();
  });

  it('should display loading state while fetching data', () => {
    (useExternalReportData as any).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: vi.fn(),
      isAdding: false,
      isUpdating: false,
      isDeleting: false,
    });

    render(<ExternalReportDataForm {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error message when data loading fails', () => {
    (useExternalReportData as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load data'),
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: vi.fn(),
      isAdding: false,
      isUpdating: false,
      isDeleting: false,
    });

    render(<ExternalReportDataForm {...defaultProps} />);

    expect(screen.getByText('Failed to load external data')).toBeInTheDocument();
  });

  it('should populate form with existing data', () => {
    (useExternalReportData as any).mockReturnValue({
      data: [
        {
          id: '1',
          dataKey: 'lastInventoryCount',
          dataValue: '100.00',
          updatedAt: new Date().toISOString(),
          deleted: false,
          workspaceId: 'test-workspace-123',
          reportType: 'PERIOD_REPORT',
          periodStartDate: '2025-01-01',
          periodEndDate: '2025-01-31',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          dataKey: 'physicalCashCount',
          dataValue: '50.00',
          updatedAt: new Date().toISOString(),
          deleted: false,
          workspaceId: 'test-workspace-123',
          reportType: 'PERIOD_REPORT',
          periodStartDate: '2025-01-01',
          periodEndDate: '2025-01-31',
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: vi.fn(),
      isAdding: false,
      isUpdating: false,
      isDeleting: false,
    });

    render(<ExternalReportDataForm {...defaultProps} />);

    const inventoryInput = screen.getByDisplayValue('100.00');
    const cashInput = screen.getByDisplayValue('50.00');
    expect(inventoryInput).toBeInTheDocument();
    expect(cashInput).toBeInTheDocument();
  });

  it('should show last updated timestamp when data exists', () => {
    const now = new Date();
    (useExternalReportData as any).mockReturnValue({
      data: [
        {
          id: '1',
          dataKey: 'lastInventoryCount',
          dataValue: '100.00',
          updatedAt: now.toISOString(),
          deleted: false,
          workspaceId: 'test-workspace-123',
          reportType: 'PERIOD_REPORT',
          periodStartDate: '2025-01-01',
          periodEndDate: '2025-01-31',
          createdAt: now.toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: vi.fn(),
      isAdding: false,
      isUpdating: false,
      isDeleting: false,
    });

    render(<ExternalReportDataForm {...defaultProps} />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('should show "No data yet" when no data exists', () => {
    render(<ExternalReportDataForm {...defaultProps} />);

    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('should handle form submission with new data', async () => {
    render(<ExternalReportDataForm {...defaultProps} />);

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '150.00' } });

    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddData).toHaveBeenCalled();
    });
  });

  it('should handle form submission with updates to existing data', async () => {
    (useExternalReportData as any).mockReturnValue({
      data: [
        {
          id: '1',
          dataKey: 'lastInventoryCount',
          dataValue: '100.00',
          updatedAt: new Date().toISOString(),
          deleted: false,
          workspaceId: 'test-workspace-123',
          reportType: 'PERIOD_REPORT',
          periodStartDate: '2025-01-01',
          periodEndDate: '2025-01-31',
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: vi.fn(),
      isAdding: false,
      isUpdating: false,
      isDeleting: false,
    });

    render(<ExternalReportDataForm {...defaultProps} />);

    const inventoryInput = screen.getByDisplayValue('100.00');
    fireEvent.change(inventoryInput, { target: { value: '200.00' } });

    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateData).toHaveBeenCalled();
    });
  });

  it('should submit form when required field is filled', async () => {
    render(<ExternalReportDataForm {...defaultProps} />);

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '150.00' } });

    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddData).toHaveBeenCalled();
    });
  });

  it('should disable form while submitting', () => {
    (useExternalReportData as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: vi.fn(),
      isAdding: true,
      isUpdating: false,
      isDeleting: false,
    });

    render(<ExternalReportDataForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: '' });
    expect(submitButton).toBeDisabled();
  });

  it('should display current values section when data exists', () => {
    (useExternalReportData as any).mockReturnValue({
      data: [
        {
          id: '1',
          dataKey: 'lastInventoryCount',
          dataValue: '100.00',
          updatedAt: new Date().toISOString(),
          deleted: false,
          workspaceId: 'test-workspace-123',
          reportType: 'PERIOD_REPORT',
          periodStartDate: '2025-01-01',
          periodEndDate: '2025-01-31',
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: vi.fn(),
      isAdding: false,
      isUpdating: false,
      isDeleting: false,
    });

    render(<ExternalReportDataForm {...defaultProps} />);

    expect(screen.getByText('Current values:')).toBeInTheDocument();
    expect(screen.getByText(/lastInventoryCount:/)).toBeInTheDocument();
  });
});

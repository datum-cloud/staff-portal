import { DataTableDateFilter } from './data-table-date-filter';
import { render, screen, fireEvent, waitFor } from '@/tests/setup/unit/test.utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock date-fns functions
vi.mock('date-fns', () => ({
  format: vi.fn((date) => date.toISOString().split('T')[0]),
  parseISO: vi.fn((dateString) => new Date(dateString)),
  isValid: vi.fn(() => true),
}));

vi.mock('date-fns-tz', () => ({
  zonedTimeToUtc: vi.fn((date) => date),
  utcToZonedTime: vi.fn((date) => date),
}));

describe('DataTableDateFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDateRange = {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-31'),
  };

  describe('Basic Rendering', () => {
    test('should render dropdown trigger button', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableDateFilter
          label="Date Range"
          placeholder="Select date range"
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('should show placeholder when no value selected', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableDateFilter
          label="Date Range"
          placeholder="Select date range"
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Select date range');
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined value', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableDateFilter
          label="Date Range"
          placeholder="Select date range"
          value={undefined}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Select date range');
    });

    test('should handle null value', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableDateFilter
          label="Date Range"
          placeholder="Select date range"
          value={null}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Select date range');
    });

    test('should handle empty presets array', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableDateFilter
          label="Date Range"
          placeholder="Select date range"
          presets={[]}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper button role', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableDateFilter
          label="Date Range"
          placeholder="Select date range"
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('should be focusable', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableDateFilter
          label="Date Range"
          placeholder="Select date range"
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});

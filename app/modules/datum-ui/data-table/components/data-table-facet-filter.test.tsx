import { DataTableFacetFilter } from './data-table-facet-filter';
import { fireEvent, render, screen } from '@/tests/setup/unit/test.utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('DataTableFacetFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOptions = [
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'pending', label: 'Pending' },
  ];

  describe('Basic Rendering', () => {
    test('should render dropdown trigger button', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableFacetFilter
          label="Status"
          placeholder="Filter by status"
          options={mockOptions}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('should show placeholder when no value selected', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableFacetFilter
          label="Status"
          placeholder="Filter by status"
          options={mockOptions}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Filter by status');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty options array', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableFacetFilter
          label="Status"
          placeholder="Filter by status"
          options={[]}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('should handle undefined value', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableFacetFilter
          label="Status"
          placeholder="Filter by status"
          options={mockOptions}
          value={undefined}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Filter by status');
    });

    test('should handle empty string value', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableFacetFilter
          label="Status"
          placeholder="Filter by status"
          options={mockOptions}
          value=""
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Filter by status');
    });

    test('should handle empty array value in multi select', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableFacetFilter
          label="Actions"
          placeholder="Filter by action"
          multiSelect
          options={mockOptions}
          value={[]}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Filter by action');
    });
  });

  describe('Accessibility', () => {
    test('should have proper button role', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableFacetFilter
          label="Status"
          placeholder="Filter by status"
          options={mockOptions}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('should be focusable', () => {
      const mockOnValueChange = vi.fn();
      render(
        <DataTableFacetFilter
          label="Status"
          placeholder="Filter by status"
          options={mockOptions}
          onValueChange={mockOnValueChange}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});

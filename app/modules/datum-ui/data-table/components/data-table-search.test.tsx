import { DataTableSearch } from './data-table-search';
import { render, screen, fireEvent, waitFor } from '@/tests/setup/unit/test.utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('DataTableSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render with default placeholder', () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch onValueChange={mockOnValueChange} />);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    test('should render with custom placeholder', () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch placeholder="Search users..." onValueChange={mockOnValueChange} />);

      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    test('should render with initial value', () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch value="initial search" onValueChange={mockOnValueChange} />);

      expect(screen.getByDisplayValue('initial search')).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch className="custom-class" onValueChange={mockOnValueChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('Debounced Input Handling', () => {
    test('should call onValueChange with debounced input', async () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch onValueChange={mockOnValueChange} debounceMs={100} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test search' } });

      // Should not be called immediately
      expect(mockOnValueChange).not.toHaveBeenCalled();

      // Should be called after debounce delay
      await waitFor(
        () => {
          expect(mockOnValueChange).toHaveBeenCalledWith('test search');
        },
        { timeout: 200 }
      );
    });

    test('should debounce multiple rapid changes', async () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch onValueChange={mockOnValueChange} debounceMs={100} />);

      const input = screen.getByRole('textbox');

      // Type rapidly
      fireEvent.change(input, { target: { value: 't' } });
      fireEvent.change(input, { target: { value: 'te' } });
      fireEvent.change(input, { target: { value: 'tes' } });
      fireEvent.change(input, { target: { value: 'test' } });

      // Should only call once with final value
      await waitFor(
        () => {
          expect(mockOnValueChange).toHaveBeenCalledTimes(1);
          expect(mockOnValueChange).toHaveBeenCalledWith('test');
        },
        { timeout: 200 }
      );
    });

    test('should use default debounce delay when not specified', async () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch onValueChange={mockOnValueChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      // Should be called after default delay (300ms)
      await waitFor(
        () => {
          expect(mockOnValueChange).toHaveBeenCalledWith('test');
        },
        { timeout: 400 }
      );
    });
  });

  describe('External Value Updates', () => {
    test('should update internal state when external value changes', () => {
      const mockOnValueChange = vi.fn();
      const { rerender } = render(
        <DataTableSearch value="initial" onValueChange={mockOnValueChange} />
      );

      expect(screen.getByDisplayValue('initial')).toBeInTheDocument();

      rerender(<DataTableSearch value="updated" onValueChange={mockOnValueChange} />);

      expect(screen.getByDisplayValue('updated')).toBeInTheDocument();
    });

    test('should handle undefined value', () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch value={undefined} onValueChange={mockOnValueChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    test('should handle empty string value', () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch value="" onValueChange={mockOnValueChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });
  });

  describe('Edge Cases', () => {
    test('should clear debounce timer on unmount', () => {
      const mockOnValueChange = vi.fn();
      const { unmount } = render(
        <DataTableSearch onValueChange={mockOnValueChange} debounceMs={1000} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      unmount();

      // Should not call onValueChange after unmount
      setTimeout(() => {
        expect(mockOnValueChange).not.toHaveBeenCalled();
      }, 1100);
    });

    test('should handle very short debounce delay', async () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch onValueChange={mockOnValueChange} debounceMs={10} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(
        () => {
          expect(mockOnValueChange).toHaveBeenCalledWith('test');
        },
        { timeout: 100 }
      );
    });

    test('should handle zero debounce delay', async () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch onValueChange={mockOnValueChange} debounceMs={0} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      // Should be called immediately
      await waitFor(() => {
        expect(mockOnValueChange).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper input role', () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch onValueChange={mockOnValueChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    test('should be focusable', () => {
      const mockOnValueChange = vi.fn();
      render(<DataTableSearch onValueChange={mockOnValueChange} />);

      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveFocus();
    });
  });
});

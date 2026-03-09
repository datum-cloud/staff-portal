import ButtonDeleteAction from './button-delete-action';
import { render, screen, waitFor } from '@/tests/setup/unit/test.utils';
import userEvent from '@testing-library/user-event';
import { expect, test, describe, vi, beforeEach } from 'vitest';

// Mock the DialogConfirm component
vi.mock('@/components/dialog/dialog-confirm', () => ({
  default: ({
    open,
    onOpenChange,
    title,
    description,
    confirmText,
    cancelText,
    variant,
    onConfirm,
    requireConfirmation,
  }: any) => {
    if (!open) return null;

    const handleConfirm = async () => {
      try {
        await onConfirm();
        onOpenChange(false);
      } catch (error) {
        // Still close dialog even if onConfirm throws an error
        onOpenChange(false);
      }
    };

    return (
      <div data-testid="dialog-confirm" data-variant={variant}>
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={handleConfirm} data-testid="confirm-button">
          {confirmText}
        </button>
        <button onClick={() => onOpenChange(false)} data-testid="cancel-button">
          {cancelText}
        </button>
        <div data-testid="require-confirmation">{requireConfirmation ? 'true' : 'false'}</div>
      </div>
    );
  },
}));

// Mock the Tooltip component
vi.mock('@datum-cloud/datum-ui/tooltip', () => ({
  Tooltip: ({ message, children }: any) => (
    <div data-testid="tooltip" title={typeof message === 'string' ? message : 'Delete'}>
      {children}
    </div>
  ),
}));

// Mock the Button component
vi.mock('@datum-cloud/datum-ui/button', () => ({
  Button: ({ children, onClick, type, size, ...props }: any) => (
    <button
      onClick={onClick}
      data-testid="delete-button"
      data-type={type}
      data-size={size}
      {...props}>
      {children}
    </button>
  ),
}));

// Mock the Trash2Icon
vi.mock('lucide-react', () => ({
  Trash2Icon: ({ size }: any) => (
    <span data-testid="trash-icon" data-size={size}>
      🗑️
    </span>
  ),
}));

describe('ButtonDeleteAction', () => {
  const defaultProps = {
    itemType: 'Project',
    description: 'This action cannot be undone.',
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render delete button with trash icon', () => {
      render(<ButtonDeleteAction {...defaultProps} />);

      const button = screen.getByTestId('delete-button');
      const icon = screen.getByTestId('trash-icon');

      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-type', 'danger');
      expect(button).toHaveAttribute('data-size', 'icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('data-size', '16');
    });

    test('should render tooltip with default message', () => {
      render(<ButtonDeleteAction {...defaultProps} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('title', 'Delete');
    });

    test('should render tooltip with custom message', () => {
      const customTooltip = 'Remove this item permanently';
      render(<ButtonDeleteAction {...defaultProps} tooltip={customTooltip} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('title', customTooltip);
    });

    test('should apply custom button props', () => {
      const customProps = {
        disabled: true,
        'data-custom': 'test',
      };

      render(<ButtonDeleteAction {...defaultProps} buttonProps={customProps} />);

      const button = screen.getByTestId('delete-button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-custom', 'test');
    });
  });

  describe('Dialog Interaction', () => {
    test('should open confirmation dialog when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ButtonDeleteAction {...defaultProps} />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
        expect(screen.getByText('Delete Project')).toBeInTheDocument();
        expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    test('should show destructive variant in dialog', async () => {
      const user = userEvent.setup();
      render(<ButtonDeleteAction {...defaultProps} />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        const dialog = screen.getByTestId('dialog-confirm');
        expect(dialog).toHaveAttribute('data-variant', 'destructive');
      });
    });

    test('should require confirmation in dialog', async () => {
      const user = userEvent.setup();
      render(<ButtonDeleteAction {...defaultProps} />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('require-confirmation')).toHaveTextContent('true');
      });
    });

    test('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ButtonDeleteAction {...defaultProps} />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog-confirm')).not.toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Flow', () => {
    test('should call onConfirm when delete is confirmed', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi.fn();
      render(<ButtonDeleteAction {...defaultProps} onConfirm={mockOnConfirm} />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('confirm-button');
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    test('should close dialog after successful confirmation', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi.fn().mockResolvedValue(undefined);
      render(<ButtonDeleteAction {...defaultProps} onConfirm={mockOnConfirm} />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('confirm-button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dialog-confirm')).not.toBeInTheDocument();
      });
    });

    test('should handle async onConfirm function', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<ButtonDeleteAction {...defaultProps} onConfirm={mockOnConfirm} />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('confirm-button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('dialog-confirm')).not.toBeInTheDocument();
      });
    });

    test('should handle onConfirm function that throws error', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi.fn().mockRejectedValue(new Error('Delete failed'));
      render(<ButtonDeleteAction {...defaultProps} onConfirm={mockOnConfirm} />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('confirm-button');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        // Dialog should still close even if onConfirm throws an error
        expect(screen.queryByTestId('dialog-confirm')).not.toBeInTheDocument();
      });
    });
  });

  describe('Different Item Types', () => {
    test('should render correct title for different item types', async () => {
      const user = userEvent.setup();

      const testCases = [
        { itemType: 'User', expectedTitle: 'Delete User' },
        { itemType: 'Organization', expectedTitle: 'Delete Organization' },
        { itemType: 'Task', expectedTitle: 'Delete Task' },
      ];

      for (const { itemType, expectedTitle } of testCases) {
        const { unmount } = render(<ButtonDeleteAction {...defaultProps} itemType={itemType} />);

        const button = screen.getByTestId('delete-button');
        await user.click(button);

        await waitFor(() => {
          expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('Accessibility', () => {
    test('should have proper button accessibility', () => {
      render(<ButtonDeleteAction {...defaultProps} />);

      const button = screen.getByTestId('delete-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-type', 'danger');
    });

    test('should have proper tooltip accessibility', () => {
      render(<ButtonDeleteAction {...defaultProps} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('title');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty itemType', async () => {
      const user = userEvent.setup();
      render(<ButtonDeleteAction {...defaultProps} itemType="" />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Delete\s*$/ })).toBeInTheDocument();
      });
    });

    test('should handle empty description', async () => {
      const user = userEvent.setup();
      render(<ButtonDeleteAction {...defaultProps} description="" />);

      const button = screen.getByTestId('delete-button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
        expect(screen.getByText('Delete Project')).toBeInTheDocument();
      });
    });

    test('should handle undefined tooltip', () => {
      render(<ButtonDeleteAction {...defaultProps} tooltip={undefined} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute('title', 'Delete');
    });
  });
});

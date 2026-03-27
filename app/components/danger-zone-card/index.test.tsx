import { DangerZoneCard } from './index';
import { render, screen, waitFor } from '@/tests/setup/unit/test.utils';
import userEvent from '@testing-library/user-event';
import { expect, test, describe, vi, beforeEach } from 'vitest';

// Mock the DialogConfirm component
vi.mock('@/components/dialog', () => ({
  DialogConfirm: ({
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

// Mock the Card components
vi.mock('@datum-cloud/datum-ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
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

// Mock the Typography components
vi.mock('@datum-cloud/datum-ui/typography', () => ({
  Text: ({ children, textColor, size, as }: any) => (
    <span data-testid="text" data-text-color={textColor} data-size={size} data-as={as}>
      {children}
    </span>
  ),
  Title: ({ children, level, weight, textColor }: any) => (
    <span data-testid="title" data-level={level} data-weight={weight} data-text-color={textColor}>
      {children}
    </span>
  ),
}));

// Mock the Trash2Icon
vi.mock('lucide-react', () => ({
  Trash2Icon: ({ className }: any) => (
    <span data-testid="trash-icon" className={className}>
      🗑️
    </span>
  ),
}));

describe('DangerZoneCard', () => {
  const defaultProps = {
    deleteTitle: 'Delete User',
    deleteDescription: 'Permanently delete this user and all associated data.',
    dialogTitle: 'Delete User',
    dialogDescription: 'This action cannot be undone. This will permanently delete the user.',
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render danger zone card with all elements', () => {
      render(<DangerZoneCard {...defaultProps} />);

      // Check card structure
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-title')).toBeInTheDocument();
      expect(screen.getByTestId('card-description')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();

      // Check danger zone title and description
      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      expect(screen.getByText('Irreversible and destructive actions')).toBeInTheDocument();

      // Check trash icon
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();

      // Check delete section
      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(
        screen.getByText('Permanently delete this user and all associated data.')
      ).toBeInTheDocument();

      // Check delete button
      const deleteButton = screen.getByTestId('delete-button');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute('data-type', 'danger');
      expect(deleteButton).toHaveAttribute('data-size', 'small');
    });

    test('should render with custom className', () => {
      const customClassName = 'custom-danger-zone';
      render(<DangerZoneCard {...defaultProps} className={customClassName} />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass(customClassName);
    });

    test('should render with default className when no custom className provided', () => {
      render(<DangerZoneCard {...defaultProps} />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-destructive/20', 'mt-4', 'shadow-none');
    });

    test('should render typography components with correct props', () => {
      render(<DangerZoneCard {...defaultProps} />);

      const title = screen.getByTestId('title');
      expect(title).toHaveAttribute('data-level', '6');
      expect(title).toHaveAttribute('data-weight', 'medium');
      expect(title).toHaveAttribute('data-text-color', 'destructive');

      const text = screen.getByTestId('text');
      expect(text).toHaveAttribute('data-text-color', 'destructive');
      expect(text).toHaveAttribute('data-size', 'sm');
      expect(text).toHaveAttribute('data-as', 'p');
    });
  });

  describe('Dialog Interaction', () => {
    test('should open confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<DangerZoneCard {...defaultProps} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-confirm')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Delete User' })).toBeInTheDocument();
        expect(
          screen.getByText('This action cannot be undone. This will permanently delete the user.')
        ).toBeInTheDocument();
        expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
        expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      });
    });

    test('should show destructive variant in dialog', async () => {
      const user = userEvent.setup();
      render(<DangerZoneCard {...defaultProps} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        const dialog = screen.getByTestId('dialog-confirm');
        expect(dialog).toHaveAttribute('data-variant', 'destructive');
      });
    });

    test('should require confirmation in dialog', async () => {
      const user = userEvent.setup();
      render(<DangerZoneCard {...defaultProps} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('require-confirmation')).toHaveTextContent('true');
      });
    });

    test('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<DangerZoneCard {...defaultProps} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

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
      render(<DangerZoneCard {...defaultProps} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

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
      render(<DangerZoneCard {...defaultProps} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

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
      render(<DangerZoneCard {...defaultProps} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

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
      render(<DangerZoneCard {...defaultProps} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

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

  describe('Different Content Types', () => {
    test('should render different delete titles and descriptions', () => {
      const testCases = [
        {
          deleteTitle: 'Delete Project',
          deleteDescription: 'Permanently delete this project and all associated data.',
          dialogTitle: 'Delete Project',
          dialogDescription:
            'This action cannot be undone. This will permanently delete the project.',
        },
        {
          deleteTitle: 'Delete Organization',
          deleteDescription: 'Permanently delete this organization and all associated data.',
          dialogTitle: 'Delete Organization',
          dialogDescription:
            'This action cannot be undone. This will permanently delete the organization.',
        },
      ];

      testCases.forEach((testCase) => {
        const { unmount } = render(<DangerZoneCard {...defaultProps} {...testCase} />);

        expect(screen.getByText(testCase.deleteTitle)).toBeInTheDocument();
        expect(screen.getByText(testCase.deleteDescription)).toBeInTheDocument();

        unmount();
      });
    });

    test('should render different dialog titles and descriptions', async () => {
      const user = userEvent.setup();
      const customProps = {
        ...defaultProps,
        dialogTitle: 'Custom Dialog Title',
        dialogDescription: 'Custom dialog description for testing.',
      };

      render(<DangerZoneCard {...customProps} />);

      const deleteButton = screen.getByTestId('delete-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Custom Dialog Title')).toBeInTheDocument();
        expect(screen.getByText('Custom dialog description for testing.')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper button accessibility', () => {
      render(<DangerZoneCard {...defaultProps} />);

      const deleteButton = screen.getByTestId('delete-button');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute('data-type', 'danger');
    });

    test('should have proper card structure', () => {
      render(<DangerZoneCard {...defaultProps} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    test('should have proper heading structure', () => {
      render(<DangerZoneCard {...defaultProps} />);

      const cardTitle = screen.getByTestId('card-title');
      expect(cardTitle).toBeInTheDocument();
      expect(cardTitle.tagName).toBe('H3');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings', () => {
      const emptyProps = {
        deleteTitle: '',
        deleteDescription: '',
        dialogTitle: '',
        dialogDescription: '',
        onConfirm: vi.fn(),
      };

      render(<DangerZoneCard {...emptyProps} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      expect(screen.getByText('Irreversible and destructive actions')).toBeInTheDocument();
    });

    test('should handle undefined className', () => {
      render(<DangerZoneCard {...defaultProps} className={undefined} />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-destructive/20', 'mt-4', 'shadow-none');
    });

    test('should handle null className', () => {
      render(<DangerZoneCard {...defaultProps} className={null as any} />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-destructive/20', 'mt-4', 'shadow-none');
    });
  });

  describe('Styling', () => {
    test('should apply destructive styling classes', () => {
      render(<DangerZoneCard {...defaultProps} />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-destructive/20');

      const cardTitle = screen.getByTestId('card-title');
      expect(cardTitle).toHaveClass('text-destructive');
    });

    test('should render trash icon with correct classes', () => {
      render(<DangerZoneCard {...defaultProps} />);

      const trashIcon = screen.getByTestId('trash-icon');
      expect(trashIcon).toHaveClass('h-4', 'w-4');
    });
  });
});

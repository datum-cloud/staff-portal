import BadgeState from './badge-state';
import { render, screen } from '@/tests/setup/unit/test.utils';
import { describe, expect, test, vi, beforeEach } from 'vitest';

// Mock the Badge component to inspect variant and classes
vi.mock('@/modules/shadcn/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div data-testid="badge" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}));

// Mock Tooltip (even though current code path doesn't reach it without icons)
vi.mock('@datum-ui/tooltip', () => ({
  Tooltip: ({ message, children }: any) => (
    <div data-testid="tooltip" title={message}>
      {children}
    </div>
  ),
}));

// Mock Loader2 icon for loading state
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => (
    <span data-testid="loader" className={className}>
      ⏳
    </span>
  ),
}));

describe('BadgeState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('returns null when state and message are empty', () => {
      const { container } = render(<BadgeState state="" />);
      expect(container.firstChild).toBeNull();
    });

    test('renders with custom message when provided', () => {
      render(<BadgeState state="active" message="Custom Label" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Custom Label');
    });

    test('renders start-cased state when message not provided', () => {
      render(<BadgeState state="inactive" />);
      expect(screen.getByTestId('badge')).toHaveTextContent('Inactive');
    });

    test('normalizes state casing', () => {
      render(<BadgeState state="AcTiVe" />);
      expect(screen.getByTestId('badge')).toHaveTextContent('Active');
    });

    test('applies base classes on badge', () => {
      render(<BadgeState state="active" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('gap-1');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
    });

    test('appends custom className', () => {
      render(<BadgeState state="active" className="extra-class" />);
      expect(screen.getByTestId('badge')).toHaveClass('extra-class');
    });
  });

  describe('Variants and colors', () => {
    test('uses configured variant for known states', () => {
      render(<BadgeState state="active" />);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'default');
    });

    test('uses destructive variant for error-like states', () => {
      render(<BadgeState state="error" />);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
    });

    test('uses secondary variant for pending', () => {
      render(<BadgeState state="pending" />);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary');
    });

    test('falls back to secondary variant for unknown states', () => {
      render(<BadgeState state="mystery" />);
      expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary');
    });

    test('uses outline variant and gray styles when noColor is true', () => {
      render(<BadgeState state="error" noColor />);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-variant', 'outline');
      expect(badge).toHaveClass('border-gray-200');
    });
  });

  describe('Loading', () => {
    test('shows loader icon when loading is true', () => {
      render(<BadgeState state="active" loading />);
      const loader = screen.getByTestId('loader');
      expect(loader).toBeInTheDocument();
      expect(loader).toHaveClass('h-3');
      expect(loader).toHaveClass('w-3');
      expect(loader).toHaveClass('animate-spin');
    });
  });
});

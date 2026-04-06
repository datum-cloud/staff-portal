import { PendingApprovalsWidget } from './pending-approvals-widget';
import * as client from '@/resources/request/client';
import { render, screen, waitFor } from '@/tests/setup/unit/test.utils';
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/resources/request/client', () => ({
  userListQuery: vi.fn(),
}));

vi.mock('@datum-cloud/datum-ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

vi.mock('@datum-cloud/datum-ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

vi.mock('@datum-cloud/datum-ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button data-testid="widget-button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@datum-cloud/datum-ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

vi.mock('@datum-cloud/datum-ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, onClick }: any) => <tr onClick={onClick}>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

vi.mock('@datum-cloud/datum-ui/typography', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
  Title: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/date', () => ({
  DateTime: ({ date }: any) => <span data-testid="datetime">{date}</span>,
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => <svg data-testid="icon-alert-circle" />,
  ArrowRight: () => <svg data-testid="icon-arrow-right" />,
  UserCheck: () => <svg data-testid="icon-user-check" />,
}));

const mockUserListQuery = vi.mocked(client.userListQuery);

function makeUser(overrides: {
  name: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  creationTimestamp?: string;
}) {
  return {
    metadata: {
      name: overrides.name,
      creationTimestamp: overrides.creationTimestamp ?? '2025-01-01T00:00:00Z',
    },
    spec: {
      email: overrides.email ?? 'user@example.com',
      givenName: overrides.givenName ?? '',
      familyName: overrides.familyName ?? '',
    },
  };
}

describe('PendingApprovalsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    test('shows "No pending approvals" when list is empty', async () => {
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('No pending approvals')).toBeInTheDocument();
      });
    });

    test('shows supporting text in empty state', async () => {
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('All registrations are up to date')).toBeInTheDocument();
      });
    });

    test('does not show a count badge in empty state', async () => {
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
      });
    });
  });

  describe('count badge', () => {
    test('renders count badge when approvals exist', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [makeUser({ name: 'user-1', givenName: 'Alice', familyName: 'Smith' })],
        metadata: {},
      } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        const badge = screen.getByTestId('badge');
        expect(badge).toBeInTheDocument();
        expect(badge.textContent).toBe('1');
      });
    });
  });

  describe('loading state', () => {
    test('renders loading skeletons while loading', () => {
      mockUserListQuery.mockImplementation(() => new Promise(() => {}));

      render(<PendingApprovalsWidget />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('does not render the table or empty state while loading', () => {
      mockUserListQuery.mockImplementation(() => new Promise(() => {}));

      render(<PendingApprovalsWidget />);

      expect(screen.queryByTestId('table')).not.toBeInTheDocument();
      expect(screen.queryByText('No pending approvals')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    test('shows error state message on failure', async () => {
      mockUserListQuery.mockRejectedValue(new Error('Unauthorized'));

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Could not load pending approvals')).toBeInTheDocument();
      });
    });

    test('shows Retry button in error state', async () => {
      mockUserListQuery.mockRejectedValue(new Error('Unauthorized'));

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    test('clicking Retry calls userListQuery again', async () => {
      mockUserListQuery.mockRejectedValueOnce(new Error('Unauthorized'));
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      screen.getByText('Retry').click();

      await waitFor(() => {
        expect(mockUserListQuery.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('full name construction', () => {
    test('constructs full name from givenName + familyName', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [makeUser({ name: 'user-abc', givenName: 'Alice', familyName: 'Smith' })],
        metadata: {},
      } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });
    });

    test('falls back to metadata.name when both givenName and familyName are absent', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [makeUser({ name: 'metadata-name-only', givenName: '', familyName: '' })],
        metadata: {},
      } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('metadata-name-only')).toBeInTheDocument();
      });
    });

    test('uses only givenName when familyName is absent', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [makeUser({ name: 'user-1', givenName: 'Alice', familyName: '' })],
        metadata: {},
      } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });
    });

    test('uses only familyName when givenName is absent', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [makeUser({ name: 'user-1', givenName: '', familyName: 'Smith' })],
        metadata: {},
      } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Smith')).toBeInTheDocument();
      });
    });
  });

  describe('data table', () => {
    test('renders a table row with email for each approval', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [
          makeUser({
            name: 'user-1',
            email: 'alice@example.com',
            givenName: 'Alice',
            familyName: 'Smith',
          }),
          makeUser({
            name: 'user-2',
            email: 'bob@example.com',
            givenName: 'Bob',
            familyName: 'Jones',
          }),
        ],
        metadata: {},
      } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByTestId('table')).toBeInTheDocument();
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
        expect(screen.getByText('Bob Jones')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      });
    });

    test('renders em dash when email is absent', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [{ metadata: { name: 'user-1', creationTimestamp: '2025-01-01T00:00:00Z' }, spec: {} }],
        metadata: {},
      } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('—')).toBeInTheDocument();
      });
    });

    test('renders creationTimestamp via DateTime component', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [
          makeUser({
            name: 'user-1',
            givenName: 'Alice',
            familyName: 'Smith',
            creationTimestamp: '2025-03-20T09:00:00Z',
          }),
        ],
        metadata: {},
      } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByTestId('datetime')).toHaveTextContent('2025-03-20T09:00:00Z');
      });
    });
  });

  describe('widget chrome', () => {
    test('renders widget title "Pending Approvals"', async () => {
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      });
    });

    test('renders "View All" button', async () => {
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      render(<PendingApprovalsWidget />);

      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });
  });
});

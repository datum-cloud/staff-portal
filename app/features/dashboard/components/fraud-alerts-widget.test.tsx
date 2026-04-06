import { FraudAlertsWidget } from './fraud-alerts-widget';
import * as client from '@/resources/request/client';
import { render, screen, waitFor } from '@/tests/setup/unit/test.utils';
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/resources/request/client', () => ({
  listFraudEvaluations: vi.fn(),
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

vi.mock('@/components/badge', () => ({
  BadgeState: ({ state, message }: any) => (
    <span data-testid="badge-state" data-state={state}>
      {message}
    </span>
  ),
}));

vi.mock('@/components/date', () => ({
  DateTime: ({ date }: any) => <span data-testid="datetime">{date}</span>,
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => <svg data-testid="icon-alert-circle" />,
  ArrowRight: () => <svg data-testid="icon-arrow-right" />,
  ShieldAlert: () => <svg data-testid="icon-shield-alert" />,
  ShieldCheck: () => <svg data-testid="icon-shield-check" />,
}));

const mockListFraudEvaluations = vi.mocked(client.listFraudEvaluations);

function makeEvaluation(overrides: {
  name: string;
  userRef?: string;
  decision: string;
  compositeScore?: number;
  creationTimestamp?: string;
}) {
  return {
    metadata: {
      name: overrides.name,
      creationTimestamp: overrides.creationTimestamp ?? '2025-01-01T00:00:00Z',
    },
    spec: { userRef: { name: overrides.userRef ?? 'user-ref' } },
    status: {
      decision: overrides.decision,
      compositeScore: overrides.compositeScore,
    },
  };
}

describe('FraudAlertsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    test('shows "No fraud alerts" when filtered list is empty', async () => {
      mockListFraudEvaluations.mockResolvedValue({ items: [] } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('No fraud alerts')).toBeInTheDocument();
      });
    });

    test('shows supporting text in empty state', async () => {
      mockListFraudEvaluations.mockResolvedValue({ items: [] } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('All evaluations are clear')).toBeInTheDocument();
      });
    });

    test('does not show a count badge in empty state', async () => {
      mockListFraudEvaluations.mockResolvedValue({ items: [] } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
      });
    });
  });

  describe('count badge', () => {
    test('renders count badge when alerts exist', async () => {
      mockListFraudEvaluations.mockResolvedValue({
        items: [makeEvaluation({ name: 'e1', decision: 'REVIEW', compositeScore: 80 })],
      } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        const badge = screen.getByTestId('badge');
        expect(badge).toBeInTheDocument();
        expect(badge.textContent).toBe('1');
      });
    });

    test('badge reflects total filtered count even when rows are capped at 5', async () => {
      const items = Array.from({ length: 7 }, (_, i) =>
        makeEvaluation({ name: `eval-${i}`, decision: 'REVIEW', compositeScore: 90 - i })
      );
      mockListFraudEvaluations.mockResolvedValue({ items } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        const badge = screen.getByTestId('badge');
        expect(badge.textContent).toBe('7');
      });
    });
  });

  describe('loading state', () => {
    test('renders loading skeletons while loading', () => {
      mockListFraudEvaluations.mockImplementation(() => new Promise(() => {}));

      render(<FraudAlertsWidget />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('does not render the table or empty state while loading', () => {
      mockListFraudEvaluations.mockImplementation(() => new Promise(() => {}));

      render(<FraudAlertsWidget />);

      expect(screen.queryByTestId('table')).not.toBeInTheDocument();
      expect(screen.queryByText('No fraud alerts')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    test('shows error state message on failure', async () => {
      mockListFraudEvaluations.mockRejectedValue(new Error('Network error'));

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Could not load fraud alerts')).toBeInTheDocument();
      });
    });

    test('shows Retry button in error state', async () => {
      mockListFraudEvaluations.mockRejectedValue(new Error('Network error'));

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    test('clicking Retry calls listFraudEvaluations again', async () => {
      mockListFraudEvaluations.mockRejectedValueOnce(new Error('Network error'));
      mockListFraudEvaluations.mockResolvedValue({ items: [] } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      screen.getByText('Retry').click();

      await waitFor(() => {
        // Called at least twice: initial + retry
        expect(mockListFraudEvaluations.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('data table', () => {
    test('renders a table row for each alert (capped at 5)', async () => {
      const items = Array.from({ length: 3 }, (_, i) =>
        makeEvaluation({
          name: `eval-${i}`,
          userRef: `user-${i}`,
          decision: 'REVIEW',
          compositeScore: 60 + i,
        })
      );
      mockListFraudEvaluations.mockResolvedValue({ items } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByTestId('table')).toBeInTheDocument();
        expect(screen.getByText('user-0')).toBeInTheDocument();
        expect(screen.getByText('user-1')).toBeInTheDocument();
        expect(screen.getByText('user-2')).toBeInTheDocument();
      });
    });

    test('renders DEACTIVATE decision badge state as error variant', async () => {
      mockListFraudEvaluations.mockResolvedValue({
        items: [makeEvaluation({ name: 'e1', decision: 'DEACTIVATE', compositeScore: 90 })],
      } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        const badge = screen.getByTestId('badge-state');
        expect(badge).toHaveAttribute('data-state', 'error');
        expect(badge.textContent).toBe('DEACTIVATE');
      });
    });

    test('renders REVIEW decision badge state as warning variant', async () => {
      mockListFraudEvaluations.mockResolvedValue({
        items: [makeEvaluation({ name: 'e1', decision: 'REVIEW', compositeScore: 55 })],
      } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        const badge = screen.getByTestId('badge-state');
        expect(badge).toHaveAttribute('data-state', 'warning');
        expect(badge.textContent).toBe('REVIEW');
      });
    });

    test('renders compositeScore in the table', async () => {
      mockListFraudEvaluations.mockResolvedValue({
        items: [makeEvaluation({ name: 'e1', decision: 'REVIEW', compositeScore: 73.5 })],
      } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('73.5')).toBeInTheDocument();
      });
    });

    test('renders em dash for undefined compositeScore', async () => {
      mockListFraudEvaluations.mockResolvedValue({
        items: [makeEvaluation({ name: 'e1', decision: 'REVIEW', compositeScore: undefined })],
      } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('—')).toBeInTheDocument();
      });
    });
  });

  describe('widget title', () => {
    test('renders widget title "Fraud Alerts"', async () => {
      mockListFraudEvaluations.mockResolvedValue({ items: [] } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Fraud Alerts')).toBeInTheDocument();
      });
    });

    test('renders "View All" button', async () => {
      mockListFraudEvaluations.mockResolvedValue({ items: [] } as any);

      render(<FraudAlertsWidget />);

      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });
  });
});

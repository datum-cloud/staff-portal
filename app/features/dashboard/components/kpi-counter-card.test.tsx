import { KpiCounterCard } from './kpi-counter-card';
import { render, screen } from '@/tests/setup/unit/test.utils';
import { describe, test, expect, vi } from 'vitest';

vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@datum-cloud/datum-ui/card', () => ({
  Card: ({ children, onClick, role, 'aria-label': ariaLabel }: any) => (
    <div data-testid="card" onClick={onClick} role={role} aria-label={ariaLabel}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

vi.mock('@datum-cloud/datum-ui/typography', () => ({
  Text: ({ children }: any) => <span data-testid="text">{children}</span>,
  Title: ({ children }: any) => <span data-testid="title">{children}</span>,
}));

describe('KpiCounterCard', () => {
  const icon = <svg data-testid="test-icon" />;

  describe('rendering', () => {
    test('renders the label', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={42}
          href="/users"
          isLoading={false}
        />
      );

      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    test('renders the count', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={99}
          href="/users"
          isLoading={false}
        />
      );

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    test('renders 0 when count is 0', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={0}
          href="/users"
          isLoading={false}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('renders icon', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={5}
          href="/users"
          isLoading={false}
        />
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    test('renders a skeleton element when isLoading=true', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={undefined}
          href="/users"
          isLoading={true}
        />
      );

      // The skeleton div is aria-hidden; check it exists and count text does not
      const skeleton = document.querySelector('[aria-hidden="true"]');
      expect(skeleton).toBeInTheDocument();
      expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
    });

    test('does not render em dash when isLoading=true', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={undefined}
          href="/users"
          isLoading={true}
        />
      );

      // Em dash character should not appear
      expect(screen.queryByText('—')).not.toBeInTheDocument();
    });

  });

  describe('error state', () => {
    test('renders em dash when isError=true', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={undefined}
          href="/users"
          isLoading={false}
          isError={true}
        />
      );

      // The &mdash; entity renders as —
      expect(screen.getByTestId('title').textContent).toContain('—');
    });

    test('does not render a skeleton when isError=true', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={undefined}
          href="/users"
          isLoading={false}
          isError={true}
        />
      );

      const skeleton = document.querySelector('[aria-hidden="true"]');
      expect(skeleton).not.toBeInTheDocument();
    });

  });

  describe('navigation', () => {
    test('renders an anchor element wrapping the card', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={5}
          href="/users"
          isLoading={false}
        />
      );

      // The Link mock renders as <a>; getByRole('link') finds it
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    test('anchor element has the correct href', () => {
      render(
        <KpiCounterCard
          icon={icon}
          label="Total Users"
          count={5}
          href="/customers/users"
          isLoading={false}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/customers/users');
    });
  });
});

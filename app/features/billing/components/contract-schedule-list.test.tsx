import { ContractScheduleList } from './contract-schedule-list';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// A viewer in New York, where midnight UTC is still the evening before.
vi.mock('@/providers/app.provider', () => ({
  useApp: () => ({ settings: { timezone: 'America/New_York' } }),
}));
vi.mock('@/utils/helpers/timezone.helper', () => ({
  getBrowserTimezone: () => 'America/New_York',
}));
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ContractScheduleList', () => {
  it('shows billing dates as their UTC day, wherever the viewer is', () => {
    const html = renderToStaticMarkup(
      <ContractScheduleList
        upcoming={[
          {
            date: new Date('2026-12-01T00:00:00Z'),
            dueDate: new Date('2026-12-31T00:00:00Z'),
            charges: [{ label: 'Setup fee' }, { label: 'Monthly fee' }] as never,
            total: 700,
            billsUsage: false,
          },
        ]}
      />
    );
    expect(html).toContain('Dec 1, 2026');
    expect(html).toContain('Dec 31');
    expect(html).not.toContain('Nov 30');
    expect(html).not.toContain('Dec 30');
  });
});

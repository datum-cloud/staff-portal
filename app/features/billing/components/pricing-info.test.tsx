import { PricingInfo } from './pricing-info';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const render = (props: Parameters<typeof PricingInfo>[0]) =>
  renderToStaticMarkup(<PricingInfo {...props} />);

describe('PricingInfo', () => {
  it("shows what the pricing is for, and labels its notes as staff's", () => {
    const html = render({
      description: 'Racking and cabling one server.',
      notes: 'Agreed with ops.',
    });
    expect(html).toContain('Racking and cabling one server.');
    expect(html).toContain('Staff note:');
    expect(html).toContain('Agreed with ops.');
  });

  it('shows the description alone when there are no notes', () => {
    const html = render({ description: 'Racking and cabling one server.', notes: ' ' });
    expect(html).toContain('Racking and cabling one server.');
    expect(html).not.toContain('Staff note');
  });

  it('clamps long text, with the whole of it on hover', () => {
    const html = render({ description: 'Racking and cabling one server.', clamp: true });
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('title="Racking and cabling one server."');
  });

  it('shows nothing without either', () => {
    expect(render({})).toBe('');
    expect(render({ description: '', notes: '  ' })).toBe('');
  });
});

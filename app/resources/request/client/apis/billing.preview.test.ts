import { createInvoicePreviewRequest, previewNextInvoice } from './billing.api';
import {
  createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest,
  readBillingMiloapisComV1Alpha1NamespacedInvoiceRequest,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/axios/axios.client', () => ({ PROXY_URL: 'http://proxy' }));
vi.mock('@openapi/billing.miloapis.com/v1alpha1', () => ({
  createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest: vi.fn(),
  readBillingMiloapisComV1Alpha1NamespacedInvoiceRequest: vi.fn(),
}));

const created = { data: { data: { metadata: { name: 'acme-ops-preview-x1' } } } };

describe('invoice previews', () => {
  beforeEach(() => {
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest).mockReset();
    vi.mocked(readBillingMiloapisComV1Alpha1NamespacedInvoiceRequest).mockReset();
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest).mockResolvedValue(
      created as never
    );
  });

  it('asks for a plain preview by default', async () => {
    await createInvoicePreviewRequest('acme', 'acme-ops');
    const body = vi.mocked(createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest).mock
      .calls[0]?.[0].body;
    expect(body?.spec).toEqual({ billingAccountRef: { name: 'acme-ops' }, mode: 'Preview' });
  });

  it('asks the provider for a draft, and returns the request with its link', async () => {
    const done = {
      metadata: { name: 'acme-ops-preview-x1' },
      status: {
        phase: 'Succeeded',
        tax: '72.00',
        draft: { url: 'https://dashboard.stripe.com/test/invoices/in_1' },
      },
    };
    vi.mocked(readBillingMiloapisComV1Alpha1NamespacedInvoiceRequest).mockResolvedValue({
      data: { data: done },
    } as never);

    const request = await previewNextInvoice('acme', 'acme-ops', { draft: true, intervalMs: 0 });

    const body = vi.mocked(createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest).mock
      .calls[0]?.[0].body;
    expect(body?.spec).toEqual({
      billingAccountRef: { name: 'acme-ops' },
      mode: 'Preview',
      draft: true,
    });
    expect(request.status?.draft?.url).toBe('https://dashboard.stripe.com/test/invoices/in_1');
  });
});

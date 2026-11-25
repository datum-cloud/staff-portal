import {
  chargeDraftListForAccountQuery,
  createInvoicePreviewRequest,
  deleteChargeDraft,
  saveChargeDraft,
} from './billing.api';
import type { ChargeDraft, ChargeDraftSpec } from '@/features/billing/lib/charges';
import {
  createBillingMiloapisComV1Alpha1NamespacedChargeDraft,
  createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest,
  deleteBillingMiloapisComV1Alpha1NamespacedChargeDraft,
  listBillingMiloapisComV1Alpha1NamespacedChargeDraft,
  replaceBillingMiloapisComV1Alpha1NamespacedChargeDraft,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/axios/axios.client', () => ({ PROXY_URL: 'http://proxy' }));
vi.mock('@openapi/billing.miloapis.com/v1alpha1', () => ({
  createBillingMiloapisComV1Alpha1NamespacedChargeDraft: vi.fn(),
  createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest: vi.fn(),
  deleteBillingMiloapisComV1Alpha1NamespacedChargeDraft: vi.fn(),
  listBillingMiloapisComV1Alpha1NamespacedChargeDraft: vi.fn(),
  replaceBillingMiloapisComV1Alpha1NamespacedChargeDraft: vi.fn(),
}));

const ORG = 'acme';
const NAMESPACE = 'organization-acme';

const httpError = (status: number) =>
  new AxiosError('request failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

const spec: ChargeDraftSpec = {
  billingAccountRef: { name: 'acme-ops' },
  invoice: 'Now',
  lines: [{ description: 'Remote hands', quantity: '3', unitAmount: '150.00', currency: 'USD' }],
};

const draft = (name: string, account: string, created: string, deleting = false): ChargeDraft => ({
  metadata: {
    name,
    resourceVersion: '7',
    creationTimestamp: created,
    ...(deleting ? { deletionTimestamp: '2026-12-01T00:00:00Z' } : {}),
  },
  spec: { ...spec, billingAccountRef: { name: account } },
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('chargeDraftListForAccountQuery', () => {
  it('lists the account’s drafts, newest first, without ones being deleted', async () => {
    vi.mocked(listBillingMiloapisComV1Alpha1NamespacedChargeDraft).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            draft('older', 'acme-ops', '2026-11-01T00:00:00Z'),
            draft('other-account', 'acme-lab', '2026-11-03T00:00:00Z'),
            draft('going', 'acme-ops', '2026-11-04T00:00:00Z', true),
            draft('newer', 'acme-ops', '2026-11-02T00:00:00Z'),
          ],
        },
      },
    } as never);
    const result = await chargeDraftListForAccountQuery(ORG, 'acme-ops');
    expect(result.served).toBe(true);
    expect(result.items.map((d) => d.metadata?.name)).toEqual(['newer', 'older']);
  });

  it.each([404, 403])(
    'reports drafts as not served when billing has no ChargeDraft yet (%i)',
    async (status) => {
      vi.mocked(listBillingMiloapisComV1Alpha1NamespacedChargeDraft).mockResolvedValue({
        status,
        data: {},
      } as never);
      expect(await chargeDraftListForAccountQuery(ORG, 'acme-ops')).toEqual({
        items: [],
        served: false,
      });
      expect(listBillingMiloapisComV1Alpha1NamespacedChargeDraft).toHaveBeenCalledWith(
        expect.objectContaining({ skipErrorToast: true })
      );
    }
  );
});

describe('saveChargeDraft', () => {
  it('creates a new draft under a generated name', async () => {
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedChargeDraft).mockResolvedValue({
      data: { data: draft('acme-ops-draft-x7k2p', 'acme-ops', '2026-11-01T00:00:00Z') },
    } as never);
    await saveChargeDraft(ORG, 'acme-ops', spec);
    expect(createBillingMiloapisComV1Alpha1NamespacedChargeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { namespace: NAMESPACE },
        body: expect.objectContaining({
          metadata: { generateName: 'acme-ops-draft-', namespace: NAMESPACE },
          spec,
        }),
        skipErrorToast: true,
      })
    );
    expect(replaceBillingMiloapisComV1Alpha1NamespacedChargeDraft).not.toHaveBeenCalled();
  });

  it('sets and removes annotations, keeping the others', async () => {
    const read = {
      ...draft('acme-ops-draft-x7k2p', 'acme-ops', '2026-11-01T00:00:00Z'),
    };
    read.metadata = { ...read.metadata, annotations: { keep: 'yes', old: 'gone' } };
    vi.mocked(replaceBillingMiloapisComV1Alpha1NamespacedChargeDraft).mockResolvedValue({
      data: { data: read },
    } as never);
    await saveChargeDraft(ORG, 'acme-ops', spec, read, { added: 'new', old: undefined });
    expect(replaceBillingMiloapisComV1Alpha1NamespacedChargeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          metadata: expect.objectContaining({ annotations: { keep: 'yes', added: 'new' } }),
        }),
      })
    );

    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedChargeDraft).mockResolvedValue({
      data: { data: read },
    } as never);
    await saveChargeDraft(ORG, 'acme-ops', spec, undefined, { added: 'new' });
    expect(createBillingMiloapisComV1Alpha1NamespacedChargeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          metadata: { generateName: 'acme-ops-draft-', namespace: NAMESPACE, annotations: { added: 'new' } },
        }),
      })
    );
  });

  it('replaces the draft as it was read, keeping its resource version', async () => {
    const read = draft('acme-ops-draft-x7k2p', 'acme-ops', '2026-11-01T00:00:00Z');
    const changed = { ...spec, invoice: 'NextInvoice' as const };
    vi.mocked(replaceBillingMiloapisComV1Alpha1NamespacedChargeDraft).mockResolvedValue({
      data: { data: read },
    } as never);
    await saveChargeDraft(ORG, 'acme-ops', changed, read);
    expect(replaceBillingMiloapisComV1Alpha1NamespacedChargeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { namespace: NAMESPACE, name: 'acme-ops-draft-x7k2p' },
        body: expect.objectContaining({
          metadata: expect.objectContaining({ resourceVersion: '7' }),
          spec: changed,
        }),
      })
    );
  });
});

describe('deleteChargeDraft', () => {
  it('takes a draft that’s already gone as discarded', async () => {
    vi.mocked(deleteBillingMiloapisComV1Alpha1NamespacedChargeDraft).mockRejectedValue(
      httpError(404)
    );
    await expect(deleteChargeDraft(ORG, 'gone')).resolves.toBeUndefined();
  });

  it('passes other failures on', async () => {
    vi.mocked(deleteBillingMiloapisComV1Alpha1NamespacedChargeDraft).mockRejectedValue(
      httpError(403)
    );
    await expect(deleteChargeDraft(ORG, 'forbidden')).rejects.toBeInstanceOf(AxiosError);
  });
});

describe('createInvoicePreviewRequest', () => {
  it('names a charge draft to preview', async () => {
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest).mockResolvedValue({
      data: { data: {} },
    } as never);
    await createInvoicePreviewRequest(ORG, 'acme-ops', {
      draft: true,
      chargeDraft: 'acme-ops-draft-x7k2p',
    });
    expect(createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          spec: {
            billingAccountRef: { name: 'acme-ops' },
            mode: 'Preview',
            draft: true,
            chargeDraftRef: { name: 'acme-ops-draft-x7k2p' },
          },
        }),
      })
    );
  });
});

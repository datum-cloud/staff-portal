import { chargeListForAccountQuery, createCharge } from './billing.api';
import type { ChargeSpec } from '@/features/billing/lib/charges';
import {
  createBillingMiloapisComV1Alpha1NamespacedCharge,
  listBillingMiloapisComV1Alpha1NamespacedCharge,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/axios/axios.client', () => ({ PROXY_URL: 'http://proxy' }));
vi.mock('@openapi/billing.miloapis.com/v1alpha1', () => ({
  createBillingMiloapisComV1Alpha1NamespacedCharge: vi.fn(),
  listBillingMiloapisComV1Alpha1NamespacedCharge: vi.fn(),
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

const spec: ChargeSpec = {
  billingAccountRef: { name: 'acme-ops' },
  description: 'Install',
  quantity: '1',
  unitAmount: '300.00',
  currency: 'USD',
  invoice: 'NextInvoice',
};

const charge = (name: string, account: string, deleting = false) => ({
  metadata: {
    name,
    ...(deleting ? { deletionTimestamp: '2026-12-01T00:00:00Z' } : {}),
  },
  spec: { ...spec, billingAccountRef: { name: account } },
});

const page = (items: unknown[], cont?: string) =>
  ({
    status: 200,
    data: { data: { items, metadata: cont ? { continue: cont } : {} } },
  }) as never;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('createCharge', () => {
  it('sends the name it was given, and skips the generic error toast', async () => {
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedCharge).mockResolvedValue({
      data: { data: charge('install-x7k2p', 'acme-ops') },
    } as never);

    await createCharge(ORG, spec, 'install-x7k2p');

    expect(createBillingMiloapisComV1Alpha1NamespacedCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { namespace: NAMESPACE },
        body: expect.objectContaining({
          metadata: { name: 'install-x7k2p', namespace: NAMESPACE },
        }),
        skipErrorToast: true,
      })
    );
  });

  it('takes AlreadyExists as an earlier try that got through', async () => {
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedCharge).mockRejectedValue(httpError(409));
    await expect(createCharge(ORG, spec, 'install-x7k2p')).resolves.toBeUndefined();
  });

  it('passes billing’s refusals on', async () => {
    const refused = httpError(422);
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedCharge).mockRejectedValue(refused);
    await expect(createCharge(ORG, spec, 'install-x7k2p')).rejects.toBe(refused);
  });
});

describe('chargeListForAccountQuery', () => {
  it('walks every page, keeping the account’s charges not being deleted', async () => {
    vi.mocked(listBillingMiloapisComV1Alpha1NamespacedCharge)
      .mockResolvedValueOnce(
        page([charge('a', 'acme-ops'), charge('b', 'other'), charge('c', 'acme-ops', true)], 'next')
      )
      .mockResolvedValueOnce(page([charge('d', 'acme-ops')]));

    const result = await chargeListForAccountQuery(ORG, 'acme-ops');

    expect(result.served).toBe(true);
    expect(result.hasMore).toBe(false);
    expect(result.items.map((item) => item.metadata?.name)).toEqual(['a', 'd']);
    expect(listBillingMiloapisComV1Alpha1NamespacedCharge).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: { limit: 500, continue: 'next' } })
    );
  });

  it('says charges aren’t served on a 404', async () => {
    vi.mocked(listBillingMiloapisComV1Alpha1NamespacedCharge).mockResolvedValue({
      status: 404,
      data: {},
    } as never);

    await expect(chargeListForAccountQuery(ORG, 'acme-ops')).resolves.toEqual({
      items: [],
      served: false,
      hasMore: false,
    });
  });
});

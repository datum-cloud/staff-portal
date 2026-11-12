import { setUpContract, type CreateContractOfferInput } from './billing.api';
import {
  createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  createBillingMiloapisComV1Alpha1NamespacedServicePricing,
  createBillingMiloapisComV1Alpha1Offer,
  deleteBillingMiloapisComV1Alpha1NamespacedServicePricing,
  deleteBillingMiloapisComV1Alpha1Offer,
  listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  patchBillingMiloapisComV1Alpha1Offer,
  readBillingMiloapisComV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/axios/axios.client', () => ({ PROXY_URL: 'http://proxy' }));
vi.mock('@openapi/billing.miloapis.com/v1alpha1', () => ({
  createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement: vi.fn(),
  createBillingMiloapisComV1Alpha1NamespacedServicePricing: vi.fn(),
  createBillingMiloapisComV1Alpha1Offer: vi.fn(),
  deleteBillingMiloapisComV1Alpha1NamespacedServicePricing: vi.fn(),
  deleteBillingMiloapisComV1Alpha1Offer: vi.fn(),
  listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement: vi.fn(),
  patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement: vi.fn(),
  patchBillingMiloapisComV1Alpha1Offer: vi.fn(),
  readBillingMiloapisComV1Alpha1Offer: vi.fn(),
}));

const ORG = 'acme';
const ACCOUNT = 'acme-ops';
const NAMESPACE = 'organization-acme';
const STARTS_AT = '2026-12-01T00:00:00Z';

const offer: CreateContractOfferInput = {
  orgName: ORG,
  accountName: ACCOUNT,
  displayName: 'Acme Ops contract',
  fees: [{ label: 'Monthly fee', chargeType: 'Recurring', amount: '1000', quantity: 1 }],
  usage: { create: [], refs: [] },
};

const httpError = (status: number) =>
  new AxiosError('request failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

const entitlement = (name: string, contract?: { startsAt: string }) => ({
  metadata: { name },
  spec: {
    billingAccountRef: { name: ACCOUNT },
    offerRef: { name: 'payg' },
    ...(contract ? { contract } : {}),
  },
});

/** The Offer the contract created, from its create call. */
const createdOfferName = () =>
  vi.mocked(createBillingMiloapisComV1Alpha1Offer).mock.calls[0]?.[0].body.metadata?.name;

beforeEach(() => {
  vi.clearAllMocks();
  const ok = { data: { data: {} } } as never;
  vi.mocked(createBillingMiloapisComV1Alpha1NamespacedServicePricing).mockResolvedValue(ok);
  vi.mocked(createBillingMiloapisComV1Alpha1Offer).mockResolvedValue(ok);
  vi.mocked(patchBillingMiloapisComV1Alpha1Offer).mockResolvedValue(ok);
  vi.mocked(deleteBillingMiloapisComV1Alpha1Offer).mockResolvedValue(ok);
  vi.mocked(deleteBillingMiloapisComV1Alpha1NamespacedServicePricing).mockResolvedValue(ok);
  // Published at once, with the fee in its snapshot.
  vi.mocked(readBillingMiloapisComV1Alpha1Offer).mockResolvedValue({
    data: { data: { spec: { servicePricings: [{ name: 'fee' }] } } },
  } as never);
  vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue({
    data: { data: entitlement(`${ACCOUNT}-contract`, { startsAt: STARTS_AT }) },
  } as never);
  vi.mocked(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue(ok);
  vi.mocked(listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue({
    data: { data: { items: [] } },
  } as never);
});

describe('setUpContract', () => {
  it('sets the contract on the entitlement the account has', async () => {
    await setUpContract({
      orgName: ORG,
      accountName: ACCOUNT,
      entitlementName: 'acme-ops-default',
      startsAt: STARTS_AT,
      offer,
    });

    expect(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).not.toHaveBeenCalled();
    expect(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { namespace: NAMESPACE, name: 'acme-ops-default' },
        body: {
          spec: { offerRef: { name: createdOfferName() }, contract: { startsAt: STARTS_AT } },
        },
      })
    );
  });

  it('creates an entitlement carrying the contract when the account has none', async () => {
    await setUpContract({ orgName: ORG, accountName: ACCOUNT, startsAt: STARTS_AT, offer });

    expect(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).not.toHaveBeenCalled();
    expect(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).toHaveBeenCalledTimes(1);
    const [call] = vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mock
      .calls[0];
    expect(call.path).toEqual({ namespace: NAMESPACE });
    expect(call.body).toEqual({
      apiVersion: 'billing.miloapis.com/v1alpha1',
      kind: 'BillingEntitlement',
      // No labels: it isn't service-catalog's default entitlement.
      metadata: { name: 'acme-ops-contract', namespace: NAMESPACE },
      spec: {
        billingAccountRef: { name: ACCOUNT },
        offerRef: { name: createdOfferName() },
        contract: { startsAt: STARTS_AT },
      },
    });
    // The Offer was published before the entitlement pointed at it.
    expect(
      vi.mocked(patchBillingMiloapisComV1Alpha1Offer).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mock
        .invocationCallOrder[0]
    );
  });

  it.each([409, 422])(
    'puts the contract on an entitlement that appeared meanwhile (%i)',
    async (status) => {
      vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockRejectedValue(
        httpError(status)
      );
      vi.mocked(listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue({
        data: { data: { items: [entitlement('acme-ops-default')] } },
      } as never);

      await setUpContract({ orgName: ORG, accountName: ACCOUNT, startsAt: STARTS_AT, offer });

      expect(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({
          path: { namespace: NAMESPACE, name: 'acme-ops-default' },
          body: {
            spec: { offerRef: { name: createdOfferName() }, contract: { startsAt: STARTS_AT } },
          },
        })
      );
      expect(deleteBillingMiloapisComV1Alpha1Offer).not.toHaveBeenCalled();
    }
  );

  it('leaves a contract set up meanwhile alone, and removes its own Offer', async () => {
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockRejectedValue(
      httpError(422)
    );
    vi.mocked(listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue({
      data: {
        data: { items: [entitlement('acme-ops-default', { startsAt: '2026-11-20T00:00:00Z' })] },
      },
    } as never);

    await expect(
      setUpContract({ orgName: ORG, accountName: ACCOUNT, startsAt: STARTS_AT, offer })
    ).rejects.toThrow(/put on a contract meanwhile/);

    expect(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).not.toHaveBeenCalled();
    expect(deleteBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledWith({
      path: { name: createdOfferName() },
    });
  });

  it('fails, and removes its own Offer, when billing rejects the entitlement', async () => {
    // A 422 for another reason, such as the start date: no entitlement appeared.
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockRejectedValue(
      httpError(422)
    );

    await expect(
      setUpContract({ orgName: ORG, accountName: ACCOUNT, startsAt: STARTS_AT, offer })
    ).rejects.toThrow(/contract wasn't saved/);

    expect(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).not.toHaveBeenCalled();
    expect(deleteBillingMiloapisComV1Alpha1Offer).toHaveBeenCalled();
  });

  it("doesn't look for another entitlement on other errors", async () => {
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockRejectedValue(
      httpError(403)
    );

    await expect(
      setUpContract({ orgName: ORG, accountName: ACCOUNT, startsAt: STARTS_AT, offer })
    ).rejects.toThrow();

    expect(listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).not.toHaveBeenCalled();
  });
});

import {
  discardContractDraft,
  publishContractDraft,
  saveContractDraft,
  setUpContract,
  type CreateContractOfferInput,
} from './billing.api';
import {
  CONTRACT_BILLING_ACCOUNT_LABEL,
  CONTRACT_ORGANIZATION_LABEL,
  CONTRACT_STARTS_AT_ANNOTATION,
} from '@/features/billing/lib/contract';
import {
  createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  createBillingMiloapisComV1Alpha1NamespacedServicePricing,
  createBillingMiloapisComV1Alpha1Offer,
  deleteBillingMiloapisComV1Alpha1NamespacedServicePricing,
  deleteBillingMiloapisComV1Alpha1Offer,
  listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  listBillingMiloapisComV1Alpha1NamespacedServicePricing,
  listBillingMiloapisComV1Alpha1Offer,
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
  listBillingMiloapisComV1Alpha1NamespacedServicePricing: vi.fn(),
  listBillingMiloapisComV1Alpha1Offer: vi.fn(),
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
  // Published at once, with every pricing in its snapshot.
  vi.mocked(readBillingMiloapisComV1Alpha1Offer).mockResolvedValue({
    data: {
      data: { spec: { servicePricings: Array.from({ length: 5 }, (_, i) => ({ name: `p${i}` })) } },
    },
  } as never);
  vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue({
    data: { data: entitlement(`${ACCOUNT}-contract`, { startsAt: STARTS_AT }) },
  } as never);
  vi.mocked(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue(ok);
  vi.mocked(listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue({
    data: { data: { items: [] } },
  } as never);
  withOffers([]);
  withContractPricings([]);
});

/** The account's contract Offers, as listed by their labels. */
const withOffers = (items: unknown[]) =>
  vi.mocked(listBillingMiloapisComV1Alpha1Offer).mockResolvedValue({
    data: { data: { items } },
  } as never);

/** The account's contract pricings in milo-system, as listed by their labels. */
const withContractPricings = (names: string[]) =>
  vi.mocked(listBillingMiloapisComV1Alpha1NamespacedServicePricing).mockResolvedValue({
    data: { data: { items: names.map((name) => ({ metadata: { name } })) } },
  } as never);

const withEntitlements = (items: unknown[]) =>
  vi.mocked(listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockResolvedValue({
    data: { data: { items } },
  } as never);

const LABELS = { [CONTRACT_BILLING_ACCOUNT_LABEL]: ACCOUNT, [CONTRACT_ORGANIZATION_LABEL]: ORG };
const DRAFT = 'contract-acme-ops-20261110090000';

const ref = (name: string) => ({ name, namespace: 'milo-system' });

/** The account's draft: its own monthly fee, plus a list fee. */
const draftOffer = (startsAt: string | null = STARTS_AT) => ({
  metadata: {
    name: DRAFT,
    creationTimestamp: '2026-11-10T09:00:00Z',
    labels: LABELS,
    annotations: {
      'kubernetes.io/display-name': 'Acme Ops contract',
      ...(startsAt ? { [CONTRACT_STARTS_AT_ANNOTATION]: startsAt } : {}),
    },
  },
  spec: {
    launchStage: 'Draft',
    chargeTypes: ['Recurring'],
    servicePricingRefs: [ref('draft-fee'), ref('cross-connect-v1')],
  },
});

/** The contract the account is on: a GA Offer sharing a pricing with the draft. */
const publishedOffer = {
  metadata: { name: 'contract-acme-ops-20261001000000', labels: LABELS },
  spec: {
    launchStage: 'GA',
    chargeTypes: ['Recurring'],
    servicePricingRefs: [ref('kept-fee')],
    servicePricings: [{ name: 'kept-fee', spec: {} }],
  },
};

const NOW = new Date('2026-11-12T10:00:00Z');

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

describe('saveContractDraft', () => {
  it('creates a draft Offer that bills nothing: unpublished, on no entitlement', async () => {
    await saveContractDraft({ offer, startsAt: STARTS_AT }, NOW);

    expect(createBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledTimes(1);
    const [call] = vi.mocked(createBillingMiloapisComV1Alpha1Offer).mock.calls[0];
    expect(call.body.metadata).toEqual({
      name: 'contract-acme-ops-20261112100000',
      labels: LABELS,
      annotations: {
        'kubernetes.io/display-name': 'Acme Ops contract',
        [CONTRACT_STARTS_AT_ANNOTATION]: STARTS_AT,
      },
    });
    expect(call.body.spec).toEqual({
      launchStage: 'Draft',
      chargeTypes: ['Recurring'],
      servicePricingRefs: [ref('contract-acme-ops-20261112100000-fee-1')],
    });
    // Its fee's pricing is made, carrying the contract labels.
    expect(createBillingMiloapisComV1Alpha1NamespacedServicePricing).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          metadata: { name: 'contract-acme-ops-20261112100000-fee-1', labels: LABELS },
        }),
      })
    );
    expect(patchBillingMiloapisComV1Alpha1Offer).not.toHaveBeenCalled();
    expect(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).not.toHaveBeenCalled();
    expect(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).not.toHaveBeenCalled();
  });

  it('updates the draft the account has, leaving the pricings it stopped using', async () => {
    withOffers([draftOffer(), publishedOffer]);
    // draft-fee is the draft's own; kept-fee the published contract's.
    withContractPricings(['draft-fee', 'kept-fee']);
    const keepListFee: CreateContractOfferInput = {
      ...offer,
      fees: [
        ...offer.fees,
        {
          label: 'Cross connect',
          chargeType: 'Recurring',
          amount: '300.00',
          quantity: 2,
          existingPricing: 'cross-connect-v1',
        },
      ],
    };

    // Once patched, the draft is listed with its new refs.
    vi.mocked(patchBillingMiloapisComV1Alpha1Offer).mockImplementation(async ({ body }) => {
      const draft = draftOffer();
      withOffers([{ ...draft, spec: { ...draft.spec, ...(body.spec as object) } }, publishedOffer]);
      return { data: { data: {} } } as never;
    });

    // A fee change: no start date.
    await saveContractDraft({ offer: keepListFee }, NOW);

    expect(createBillingMiloapisComV1Alpha1Offer).not.toHaveBeenCalled();
    expect(patchBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { name: DRAFT },
        body: {
          metadata: {
            annotations: {
              'kubernetes.io/display-name': 'Acme Ops contract',
              [CONTRACT_STARTS_AT_ANNOTATION]: null,
            },
          },
          spec: {
            chargeTypes: ['Recurring'],
            servicePricingRefs: [
              ref('contract-acme-ops-20261112100000-fee-1'),
              { ...ref('cross-connect-v1'), quantity: 2 },
            ],
          },
        },
      })
    );
    // Staff can't delete pricings, so the old fee's is left: trying would
    // fail and show an error after the draft was saved.
    expect(deleteBillingMiloapisComV1Alpha1NamespacedServicePricing).not.toHaveBeenCalled();
  });

  it("removes the pricings it made when the draft can't be saved", async () => {
    vi.mocked(createBillingMiloapisComV1Alpha1Offer).mockRejectedValue(httpError(422));

    await expect(saveContractDraft({ offer }, NOW)).rejects.toThrow(/draft wasn't saved/);

    expect(deleteBillingMiloapisComV1Alpha1NamespacedServicePricing).toHaveBeenCalledWith({
      path: { namespace: 'milo-system', name: 'contract-acme-ops-20261112100000-fee-1' },
    });
  });
});

describe('publishContractDraft', () => {
  const COPY = 'contract-acme-ops-20261112100000';

  it('sets up a contract on a new entitlement for an account without one', async () => {
    withOffers([draftOffer()]);

    await publishContractDraft(ORG, ACCOUNT, DRAFT, NOW);

    // A published copy of the draft, with the draft's pricings: none made.
    expect(createBillingMiloapisComV1Alpha1NamespacedServicePricing).not.toHaveBeenCalled();
    const [created] = vi.mocked(createBillingMiloapisComV1Alpha1Offer).mock.calls[0];
    expect(created.body.metadata).toEqual({
      name: COPY,
      labels: LABELS,
      annotations: { 'kubernetes.io/display-name': 'Acme Ops contract' },
    });
    expect(created.body.spec?.servicePricingRefs).toEqual(draftOffer().spec.servicePricingRefs);
    expect(patchBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledWith(
      expect.objectContaining({ path: { name: COPY }, body: { spec: { launchStage: 'GA' } } })
    );
    expect(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          spec: {
            billingAccountRef: { name: ACCOUNT },
            offerRef: { name: COPY },
            contract: { startsAt: STARTS_AT },
          },
        }),
      })
    );
    // Then the draft goes, but not the pricings the contract now bills.
    expect(deleteBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledWith({ path: { name: DRAFT } });
    expect(deleteBillingMiloapisComV1Alpha1NamespacedServicePricing).not.toHaveBeenCalled();
  });

  it("sets up a contract on the account's entitlement", async () => {
    withOffers([draftOffer()]);
    withEntitlements([entitlement('acme-ops-default')]);

    await publishContractDraft(ORG, ACCOUNT, DRAFT, NOW);

    expect(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).not.toHaveBeenCalled();
    expect(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { namespace: NAMESPACE, name: 'acme-ops-default' },
        body: { spec: { offerRef: { name: COPY }, contract: { startsAt: STARTS_AT } } },
      })
    );
  });

  it('changes the fees of the contract the account is on', async () => {
    withOffers([draftOffer(null)]);
    withEntitlements([entitlement('acme-ops-default', { startsAt: '2026-10-01T00:00:00Z' })]);

    await publishContractDraft(ORG, ACCOUNT, DRAFT, NOW);

    expect(patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({ body: { spec: { offerRef: { name: COPY } } } })
    );
  });

  it('keeps the draft when publishing fails, and removes only its copy', async () => {
    withOffers([draftOffer()]);
    vi.mocked(createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement).mockRejectedValue(
      httpError(403)
    );

    await expect(publishContractDraft(ORG, ACCOUNT, DRAFT, NOW)).rejects.toThrow(
      /draft wasn't published/
    );

    expect(deleteBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledTimes(1);
    expect(deleteBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledWith({ path: { name: COPY } });
    expect(deleteBillingMiloapisComV1Alpha1NamespacedServicePricing).not.toHaveBeenCalled();
  });

  it("publishes nothing when the draft's start date has passed", async () => {
    withOffers([draftOffer('2026-11-01T00:00:00Z')]);

    await expect(publishContractDraft(ORG, ACCOUNT, DRAFT, NOW)).rejects.toThrow(
      /start date has passed/
    );

    expect(createBillingMiloapisComV1Alpha1Offer).not.toHaveBeenCalled();
  });

  it('publishes nothing when the draft changed meanwhile', async () => {
    withOffers([]);

    await expect(publishContractDraft(ORG, ACCOUNT, DRAFT, NOW)).rejects.toThrow(/Reload/);

    expect(createBillingMiloapisComV1Alpha1Offer).not.toHaveBeenCalled();
  });
});

describe('discardContractDraft', () => {
  it('deletes the draft, leaving its pricings', async () => {
    const draft = draftOffer();
    draft.spec.servicePricingRefs.push(ref('kept-fee'));
    withOffers([draft, publishedOffer]);
    withContractPricings(['draft-fee', 'kept-fee']);
    // Once deleted, it's no longer listed.
    vi.mocked(deleteBillingMiloapisComV1Alpha1Offer).mockImplementation(async () => {
      withOffers([publishedOffer]);
      return { data: { data: {} } } as never;
    });

    await discardContractDraft(ORG, ACCOUNT, DRAFT);

    expect(deleteBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledWith({ path: { name: DRAFT } });
    // Staff can't delete pricings, so none is tried: a 403 would show an
    // error after the draft was discarded.
    expect(deleteBillingMiloapisComV1Alpha1NamespacedServicePricing).not.toHaveBeenCalled();
  });

  it('discards the draft after a contract is set up from it', async () => {
    withOffers([draftOffer()]);

    await setUpContract({
      orgName: ORG,
      accountName: ACCOUNT,
      startsAt: STARTS_AT,
      offer,
      draftName: DRAFT,
    });

    expect(deleteBillingMiloapisComV1Alpha1Offer).toHaveBeenCalledWith({ path: { name: DRAFT } });
  });
});

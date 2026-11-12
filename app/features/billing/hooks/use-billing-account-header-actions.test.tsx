import type { PaymentTermsState } from '../components/payment-terms';
import { useBillingAccountHeaderActions } from './use-billing-account-header-actions';
import {
  useBillingEntitlementForAccountQuery,
  useContractDraftQuery,
} from '@/resources/request/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router', () => ({ useNavigate: () => navigate }));
// Each label renders as its text, to tell them apart.
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: string }) => children,
}));
vi.mock('@/resources/request/client', () => ({
  useBillingEntitlementForAccountQuery: vi.fn(),
  useContractDraftQuery: vi.fn(),
}));

type EntitlementQuery = ReturnType<typeof useBillingEntitlementForAccountQuery>;

/** The entitlement query as the hook sees it: only its data matters. */
const withEntitlementQuery = (query: Partial<EntitlementQuery>) =>
  vi.mocked(useBillingEntitlementForAccountQuery).mockReturnValue(query as EntitlementQuery);

const paymentTerms = { isLoading: false, dialogs: {} } as unknown as PaymentTermsState;

/** The header's actions, by key. Its own hooks are mocked, so it's called directly. */
const useActions = () => {
  const list = useBillingAccountHeaderActions({
    orgName: 'acme',
    account: { metadata: { name: 'acme-ops' } },
    paymentTerms,
    onSwitchOffer: vi.fn(),
  });
  return Object.fromEntries(list.map((action) => [action.key, action]));
};

const entitlement = (contract?: { startsAt: string }) => ({
  metadata: { name: 'acme-ops-default' },
  spec: {
    billingAccountRef: { name: 'acme-ops' },
    offerRef: { name: 'payg' },
    ...(contract ? { contract } : {}),
  },
});

const withDraft = (draft: boolean) =>
  vi.mocked(useContractDraftQuery).mockReturnValue({
    data: draft ? { metadata: { name: 'contract-acme-ops-20261110090000' } } : null,
  } as ReturnType<typeof useContractDraftQuery>);

/** An action's label as its text. */
const labelText = (action: { label: unknown }) =>
  (action.label as { props: { children: string } }).props.children;

beforeEach(() => {
  vi.clearAllMocks();
  withDraft(false);
});

describe('useBillingAccountHeaderActions', () => {
  it('lets an account without an entitlement set up a contract', () => {
    // The query found no entitlement for the account.
    withEntitlementQuery({ data: null, isSuccess: true });

    const { contract, offer } = useActions();

    expect(contract.disabled).toBe(false);
    // There's still no offer to switch.
    expect(offer.disabled).toBe(true);
    contract.onSelect();
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('acme-ops'));
  });

  it('waits for the entitlement to load', () => {
    withEntitlementQuery({ data: undefined, isLoading: true });

    expect(useActions().contract.disabled).toBe(true);
  });

  it("doesn't offer a contract when the entitlement couldn't be loaded", () => {
    withEntitlementQuery({ data: undefined, isError: true });

    expect(useActions().contract.disabled).toBe(true);
  });

  it('sets up a contract on the entitlement the account has', () => {
    withEntitlementQuery({ data: entitlement(), isSuccess: true });

    const { contract, offer } = useActions();

    expect(contract.disabled).toBe(false);
    expect(offer.disabled).toBe(false);
  });

  it("changes the fees of an account that's on a contract", () => {
    withEntitlementQuery({
      data: entitlement({ startsAt: '2026-12-01T00:00:00Z' }),
      isSuccess: true,
    });

    expect(useActions().contract.disabled).toBeFalsy();
  });

  it('opens the draft when there is one', () => {
    withDraft(true);
    withEntitlementQuery({ data: null, isSuccess: true });
    expect(labelText(useActions().contract)).toBe('Edit draft contract');
    expect(useActions().contract.disabled).toBe(false);

    withEntitlementQuery({
      data: entitlement({ startsAt: '2026-12-01T00:00:00Z' }),
      isSuccess: true,
    });
    expect(labelText(useActions().contract)).toBe('Edit draft fee change');
  });

  it('names the action for what it does without a draft', () => {
    withEntitlementQuery({ data: null, isSuccess: true });
    expect(labelText(useActions().contract)).toBe('Set up contract');

    withEntitlementQuery({
      data: entitlement({ startsAt: '2026-12-01T00:00:00Z' }),
      isSuccess: true,
    });
    expect(labelText(useActions().contract)).toBe('Change contract fees');
  });
});

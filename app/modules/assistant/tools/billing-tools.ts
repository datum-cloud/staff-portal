import { datumGet } from './api-helpers';
import {
  summarizeAccountStanding,
  summarizeApplication,
  summarizeArrangement,
  summarizeEntitlement,
  summarizeInvoice,
  summarizeInvoiceTotals,
  summarizeOffer,
  summarizeUsage,
} from './billing-summaries';
import { projectDisplayName } from './display-name';
import { sortInvoicesPastDueFirst } from '@/features/billing/lib/invoice-summary';
import { getArrangementsForAccount } from '@/features/billing/lib/payment-terms';
import {
  BILLING_SERVICE_CONFIGURATION_NAME,
  buildOrganizationNamespace,
  getActiveBindingsForAccount,
  getActiveProjectBinding,
  getBillingAccountDisplayName,
  isDefaultPaymentMethod,
  isStaleInvoice,
  orgNameFromNamespace,
  type BillingEntitlement,
  type Invoice,
} from '@/features/billing/utils';
import { loadOrgUsageDashboard } from '@/modules/billing/usage.server';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingAccountBinding,
  ComMiloapisBillingV1Alpha1BillingArrangement,
  ComMiloapisBillingV1Alpha1BillingArrangementApplication,
  ComMiloapisBillingV1Alpha1Offer,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { tool } from 'ai';
import { z } from 'zod';

interface BillingToolDeps {
  accessToken: string;
}

function normalizeOrgName(orgName: string): string {
  return orgName.startsWith('organizations/') ? orgName.slice('organizations/'.length) : orgName;
}

function normalizeProjectName(projectName: string): string {
  return projectName.startsWith('projects/') ? projectName.slice('projects/'.length) : projectName;
}

function orgBillingPath(orgName: string, subPath: string): string {
  const namespace = buildOrganizationNamespace(orgName);
  return `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane/apis/billing.miloapis.com/v1alpha1/namespaces/${namespace}/${subPath}`;
}

const BILLING_ROOT = '/apis/billing.miloapis.com/v1alpha1';

/** Most invoices returned in one list; the rest are counted. */
const MAX_INVOICES = 50;

/** The default offer new accounts get, from billing's service configuration. */
async function defaultOfferName(accessToken: string): Promise<string> {
  const result = await datumGet(
    `/apis/services.miloapis.com/v1alpha1/serviceconfigurations/${BILLING_SERVICE_CONFIGURATION_NAME}`,
    accessToken
  );
  return result?.error ? '' : (result?.spec?.defaultOffer?.trim() ?? '');
}

/** Most pages read when listing every invoice on the platform. */
const MAX_LIST_PAGES = 10;

/**
 * Every item of a platform-wide list, page by page, up to MAX_LIST_PAGES.
 * `truncated` says the walk stopped before the end.
 */
async function datumListAll(
  path: string,
  accessToken: string
): Promise<{ items: unknown[]; truncated: boolean } | { error: string }> {
  const items: unknown[] = [];
  let cont = '';
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const result = await datumGet(
      cont ? `${path}${sep}continue=${encodeURIComponent(cont)}` : path,
      accessToken
    );
    if (result.error) return result;
    items.push(...(result.items ?? []));
    cont = result.metadata?.continue ?? '';
    if (!cont) return { items, truncated: false };
  }
  return { items, truncated: true };
}

/** Invoices worth showing: not the leftovers nothing updates any more. */
function liveInvoices(items: unknown[] | undefined): Invoice[] {
  return filterNotDeleting((items ?? []) as Invoice[]).filter(
    (invoice) => !isStaleInvoice(invoice)
  );
}

/** Offers made for one account's contract: labelled, or named contract-…. */
function isContractOffer(offer: ComMiloapisBillingV1Alpha1Offer): boolean {
  return (
    Boolean(offer.metadata?.labels?.['billing.miloapis.com/contract-billing-account']) ||
    (offer.metadata?.name ?? '').startsWith('contract-')
  );
}

function isActiveBinding(binding: ComMiloapisBillingV1Alpha1BillingAccountBinding): boolean {
  return !binding.status?.phase || binding.status.phase === 'Active';
}

function isBillingAccountReady(account: ComMiloapisBillingV1Alpha1BillingAccount): boolean {
  return account.status?.phase === 'Ready';
}

function filterNotDeleting<T extends { metadata?: { deletionTimestamp?: string } }>(
  items: T[]
): T[] {
  return items.filter((item) => !item.metadata?.deletionTimestamp);
}

function sanitizeBillingAccountSummary(
  account: ComMiloapisBillingV1Alpha1BillingAccount,
  linkedProjectCount: number,
  orgName: string
) {
  const name = account.metadata?.name ?? '';
  return {
    name,
    orgName,
    displayName: getBillingAccountDisplayName(account),
    phase: account.status?.phase ?? 'Provisioning',
    ready: isBillingAccountReady(account),
    currencyCode: account.spec?.currencyCode ?? 'USD',
    defaultPaymentMethodName: account.spec?.defaultPaymentMethodRef?.name ?? null,
    linkedProjectCount,
    url: billingAccountRoutes.detail(orgName, name),
  };
}

function sanitizePaymentMethod(
  method: ComMiloapisBillingV1Alpha1PaymentMethod,
  account: ComMiloapisBillingV1Alpha1BillingAccount | undefined,
  orgName: string
) {
  const card = method.status?.details?.card;
  const billingAccountName = method.spec?.billingAccountRef?.name ?? '';
  return {
    name: method.metadata?.name ?? '',
    displayName: method.spec?.displayName ?? method.metadata?.name ?? '',
    billingAccountName,
    phase: method.status?.phase ?? 'Pending',
    isDefault: isDefaultPaymentMethod(method, account),
    card: card
      ? {
          brand: card.brand ?? '',
          last4: card.last4 ?? '',
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
        }
      : null,
    url: billingAccountName
      ? billingAccountRoutes.detail(orgName, billingAccountName)
      : billingAccountRoutes.list(),
  };
}

function sanitizePaymentMethodSummary(
  method: ComMiloapisBillingV1Alpha1PaymentMethod | undefined,
  account: ComMiloapisBillingV1Alpha1BillingAccount | undefined,
  orgName: string
) {
  if (!method) return null;
  const sanitized = sanitizePaymentMethod(method, account, orgName);
  return {
    name: sanitized.name,
    displayName: sanitized.displayName,
    phase: sanitized.phase,
    card: sanitized.card,
    isDefault: sanitized.isDefault,
  };
}

function projectCountByAccount(
  bindings: ComMiloapisBillingV1Alpha1BillingAccountBinding[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const binding of bindings.filter(isActiveBinding)) {
    const accountName = binding.spec?.billingAccountRef?.name;
    if (!accountName) continue;
    counts.set(accountName, (counts.get(accountName) ?? 0) + 1);
  }
  return counts;
}

export function createBillingTools({ accessToken }: BillingToolDeps) {
  return {
    listBillingAccounts: tool({
      description:
        'List billing accounts across the platform or within one organization.' +
        ' Use when the operator asks about billing accounts, funding, or which accounts exist.',
      inputSchema: z.object({
        orgName: z
          .string()
          .optional()
          .describe('Optional organization resource name to scope the list'),
      }),
      execute: async ({ orgName }: { orgName?: string }) => {
        if (orgName) {
          const name = normalizeOrgName(orgName);
          const [accountsResult, bindingsResult] = await Promise.all([
            datumGet(orgBillingPath(name, 'billingaccounts'), accessToken),
            datumGet(orgBillingPath(name, 'billingaccountbindings'), accessToken),
          ]);
          if (accountsResult.error) return accountsResult;

          const accounts = filterNotDeleting(
            (accountsResult.items ?? []) as ComMiloapisBillingV1Alpha1BillingAccount[]
          );
          const bindings = filterNotDeleting(
            (bindingsResult.error
              ? []
              : (bindingsResult.items ?? [])) as ComMiloapisBillingV1Alpha1BillingAccountBinding[]
          );
          const counts = projectCountByAccount(bindings);

          return {
            accounts: accounts.map((account) =>
              sanitizeBillingAccountSummary(
                account,
                counts.get(account.metadata?.name ?? '') ?? 0,
                name
              )
            ),
            url: billingAccountRoutes.list(),
          };
        }

        const result = await datumGet(
          '/apis/billing.miloapis.com/v1alpha1/billingaccounts?limit=100',
          accessToken
        );
        if (result.error) return result;

        const accounts = filterNotDeleting(
          (result.items ?? []) as ComMiloapisBillingV1Alpha1BillingAccount[]
        );

        return {
          accounts: accounts.map((account) => {
            const accountOrgName = orgNameFromNamespace(account.metadata?.namespace);
            return sanitizeBillingAccountSummary(account, 0, accountOrgName);
          }),
          url: billingAccountRoutes.list(),
        };
      },
    }),

    getBillingAccount: tool({
      description:
        'Get details for a specific billing account: contact, linked projects, default payment method,' +
        ' whether it can pay and is up to date with its invoices, its payment terms, and its offer or contract.',
      inputSchema: z.object({
        orgName: z.string().describe('The organization resource name'),
        billingAccountName: z.string().describe('The billing account resource name'),
      }),
      execute: async ({
        orgName,
        billingAccountName,
      }: {
        orgName: string;
        billingAccountName: string;
      }) => {
        const name = normalizeOrgName(orgName);
        const [accountResult, bindingsResult, paymentMethodsResult, entitlementsResult] =
          await Promise.all([
            datumGet(orgBillingPath(name, `billingaccounts/${billingAccountName}`), accessToken),
            datumGet(orgBillingPath(name, 'billingaccountbindings'), accessToken),
            datumGet(orgBillingPath(name, 'paymentmethods'), accessToken),
            datumGet(orgBillingPath(name, 'billingentitlements'), accessToken),
          ]);
        if (accountResult.error) return accountResult;

        const entitlement = filterNotDeleting(
          (entitlementsResult.error ? [] : (entitlementsResult.items ?? [])) as BillingEntitlement[]
        ).find((be) => be.spec?.billingAccountRef?.name === billingAccountName);
        const offerName = entitlement?.spec?.offerRef?.name;
        const offerResult = offerName
          ? await datumGet(`${BILLING_ROOT}/offers/${offerName}`, accessToken)
          : null;
        const offer =
          offerResult && !offerResult.error
            ? (offerResult as ComMiloapisBillingV1Alpha1Offer)
            : null;

        const account = accountResult as ComMiloapisBillingV1Alpha1BillingAccount;
        const bindings = filterNotDeleting(
          (bindingsResult.error
            ? []
            : (bindingsResult.items ?? [])) as ComMiloapisBillingV1Alpha1BillingAccountBinding[]
        );
        const paymentMethods = filterNotDeleting(
          (paymentMethodsResult.error
            ? []
            : (paymentMethodsResult.items ?? [])) as ComMiloapisBillingV1Alpha1PaymentMethod[]
        );

        const linkedBindings = getActiveBindingsForAccount(bindings, billingAccountName);
        const linkedProjects = linkedBindings
          .map((binding) => binding.spec?.projectRef?.name)
          .filter((projectName): projectName is string => Boolean(projectName))
          .map((projectName) => ({
            name: projectName,
            url: `/customers/projects/${encodeURIComponent(projectName)}`,
          }));

        const accountPaymentMethods = paymentMethods.filter(
          (pm) => pm.spec?.billingAccountRef?.name === billingAccountName
        );
        const defaultPmName = account.spec?.defaultPaymentMethodRef?.name;
        const defaultPaymentMethod = sanitizePaymentMethodSummary(
          accountPaymentMethods.find((pm) => pm.metadata?.name === defaultPmName),
          account,
          name
        );

        const contact = account.spec?.contactInfo;
        const address = contact?.address;

        return {
          ...sanitizeBillingAccountSummary(account, linkedProjects.length, name),
          contact: {
            name: contact?.name,
            businessName: contact?.businessName,
            email: contact?.email,
            invoiceEmailCount: contact?.invoiceEmails?.length ?? 0,
          },
          address: address
            ? {
                city: address.city,
                country: address.country,
                region: address.region,
                postalCode: address.postalCode,
              }
            : null,
          taxIds:
            account.spec?.taxIds?.map((tax) => ({
              type: tax.type,
            })) ?? [],
          linkedProjects,
          defaultPaymentMethod,
          paymentMethodCount: accountPaymentMethods.length,
          standing: summarizeAccountStanding(account),
          offer: summarizeEntitlement(entitlement, offer, new Date()),
        };
      },
    }),

    getProjectBillingBinding: tool({
      description:
        'Get the billing account that funds a project.' +
        ' Use when the operator asks which account pays for a project.',
      inputSchema: z.object({
        projectName: z.string().describe('The project resource name'),
      }),
      execute: async ({ projectName }: { projectName: string }) => {
        const name = normalizeProjectName(projectName);
        const project = await datumGet(
          `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${name}`,
          accessToken
        );
        if (project.error) return project;

        const orgName = project.spec?.organizationRef?.name;
        if (!orgName) {
          return { error: 'Project has no organization reference.' };
        }

        const bindingsResult = await datumGet(
          orgBillingPath(orgName, 'billingaccountbindings'),
          accessToken
        );
        if (bindingsResult.error) return bindingsResult;

        const bindings = filterNotDeleting(
          (bindingsResult.items ?? []) as ComMiloapisBillingV1Alpha1BillingAccountBinding[]
        );
        const binding = getActiveProjectBinding(bindings, name);

        if (!binding?.spec?.billingAccountRef?.name) {
          return {
            status: 'no-binding' as const,
            message: 'This project does not have a billing account binding.',
            projectName: name,
            projectUrl: `/customers/projects/${encodeURIComponent(name)}`,
          };
        }

        const billingAccountName = binding.spec.billingAccountRef.name;
        const accountResult = await datumGet(
          orgBillingPath(orgName, `billingaccounts/${billingAccountName}`),
          accessToken
        );
        if (accountResult.error) return accountResult;

        const account = accountResult as ComMiloapisBillingV1Alpha1BillingAccount;

        return {
          status: 'ok' as const,
          projectName: name,
          projectDisplayName: projectDisplayName(project.metadata) || name,
          orgName,
          billingAccountName,
          billingAccountDisplayName: getBillingAccountDisplayName(account),
          billingAccountPhase: account.status?.phase ?? 'Provisioning',
          billingAccountReady: isBillingAccountReady(account),
          billingAccountUrl: billingAccountRoutes.detail(orgName, billingAccountName),
          projectUrl: `/customers/projects/${encodeURIComponent(name)}`,
        };
      },
    }),

    listPaymentMethods: tool({
      description:
        'List payment methods for an organization, optionally filtered to one billing account.' +
        ' Use when the operator asks about cards or payment methods on file.',
      inputSchema: z.object({
        orgName: z.string().describe('The organization resource name'),
        billingAccountName: z
          .string()
          .optional()
          .describe('Optional billing account name to filter payment methods'),
      }),
      execute: async ({
        orgName,
        billingAccountName,
      }: {
        orgName: string;
        billingAccountName?: string;
      }) => {
        const name = normalizeOrgName(orgName);
        const [paymentMethodsResult, accountsResult] = await Promise.all([
          datumGet(orgBillingPath(name, 'paymentmethods'), accessToken),
          datumGet(orgBillingPath(name, 'billingaccounts'), accessToken),
        ]);
        if (paymentMethodsResult.error) return paymentMethodsResult;

        const paymentMethods = filterNotDeleting(
          (paymentMethodsResult.items ?? []) as ComMiloapisBillingV1Alpha1PaymentMethod[]
        );
        const accounts = filterNotDeleting(
          (accountsResult.error
            ? []
            : (accountsResult.items ?? [])) as ComMiloapisBillingV1Alpha1BillingAccount[]
        );

        const accountByName = new Map(
          accounts.map((account) => [account.metadata?.name ?? '', account])
        );

        const filtered = billingAccountName
          ? paymentMethods.filter((pm) => pm.spec?.billingAccountRef?.name === billingAccountName)
          : paymentMethods;

        return {
          paymentMethods: filtered.map((pm) =>
            sanitizePaymentMethod(
              pm,
              accountByName.get(pm.spec?.billingAccountRef?.name ?? ''),
              name
            )
          ),
          url: billingAccountName
            ? billingAccountRoutes.detail(name, billingAccountName)
            : billingAccountRoutes.list(),
        };
      },
    }),
    listInvoices: tool({
      description:
        "List an organization's invoices, optionally for one billing account, with what's owed and" +
        ' how overdue each is. Past-due invoices come first. Use for invoice history, balances owed,' +
        ' or "is this account paid up?".',
      inputSchema: z.object({
        orgName: z.string().describe('The organization resource name'),
        billingAccountName: z
          .string()
          .optional()
          .describe('Optional billing account name to filter invoices'),
      }),
      execute: async ({
        orgName,
        billingAccountName,
      }: {
        orgName: string;
        billingAccountName?: string;
      }) => {
        const name = normalizeOrgName(orgName);
        const result = await datumGet(orgBillingPath(name, 'invoices?limit=500'), accessToken);
        if (result.error) return result;

        const now = new Date();
        const invoices = liveInvoices(result.items).filter(
          (invoice) =>
            !billingAccountName || invoice.spec?.billingAccountRef?.name === billingAccountName
        );
        const sorted = sortInvoicesPastDueFirst(invoices);
        return {
          totals: summarizeInvoiceTotals(invoices, now),
          invoices: sorted.slice(0, MAX_INVOICES).map((invoice) => summarizeInvoice(invoice, now)),
          moreInvoices: Math.max(0, sorted.length - MAX_INVOICES),
          url: billingAccountName
            ? billingAccountRoutes.detail(name, billingAccountName)
            : billingAccountRoutes.list(),
        };
      },
    }),

    listPastDueInvoices: tool({
      description:
        'List past-due invoices across the whole platform, most overdue first.' +
        ' Use when the operator asks who owes money, which accounts are overdue, or for a collections view.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await datumListAll(`${BILLING_ROOT}/invoices?limit=500`, accessToken);
        if ('error' in result) return result;

        const now = new Date();
        const pastDue = liveInvoices(result.items)
          .filter((invoice) => invoice.status?.phase === 'PastDue')
          .map((invoice) => {
            const orgName = orgNameFromNamespace(invoice.metadata?.namespace);
            const summary = summarizeInvoice(invoice, now);
            return {
              ...summary,
              orgName,
              url: summary.billingAccountName
                ? billingAccountRoutes.detail(orgName, summary.billingAccountName)
                : billingAccountRoutes.list(),
            };
          })
          .sort((a, b) => b.daysOverdue - a.daysOverdue);
        return {
          pastDueCount: pastDue.length,
          invoices: pastDue.slice(0, MAX_INVOICES),
          moreInvoices: Math.max(0, pastDue.length - MAX_INVOICES),
          // Stopped paging before the end of the platform's invoices.
          truncatedList: result.truncated,
        };
      },
    }),

    getPaymentTerms: tool({
      description:
        "Get a billing account's payment terms (invoice terms granted by staff): the terms in effect" +
        " or scheduled, earlier ones, and the customer's applications for terms." +
        ' Use when the operator asks about net days, credit limits, PO numbers, or a terms application.',
      inputSchema: z.object({
        orgName: z.string().describe('The organization resource name'),
        billingAccountName: z.string().describe('The billing account resource name'),
      }),
      execute: async ({
        orgName,
        billingAccountName,
      }: {
        orgName: string;
        billingAccountName: string;
      }) => {
        const name = normalizeOrgName(orgName);
        const [arrangementsResult, applicationsResult] = await Promise.all([
          datumGet(orgBillingPath(name, 'billingarrangements'), accessToken),
          datumGet(orgBillingPath(name, 'billingarrangementapplications'), accessToken),
        ]);
        if (arrangementsResult.error) return arrangementsResult;

        const now = new Date();
        const arrangements = getArrangementsForAccount(
          filterNotDeleting(
            (arrangementsResult.items ?? []) as ComMiloapisBillingV1Alpha1BillingArrangement[]
          ),
          billingAccountName
        ).map((arrangement) => summarizeArrangement(arrangement, now));
        const applications = filterNotDeleting(
          (applicationsResult.error
            ? []
            : (applicationsResult.items ??
              [])) as ComMiloapisBillingV1Alpha1BillingArrangementApplication[]
        )
          .filter((app) => app.spec?.billingAccountRef?.name === billingAccountName)
          .map((app) => summarizeApplication(app, name));

        return {
          current:
            arrangements.find((a) => a.phase === 'Active') ??
            arrangements.find((a) => a.phase === 'Scheduled') ??
            null,
          history: arrangements,
          applications,
          url: billingAccountRoutes.detail(name, billingAccountName),
        };
      },
    }),

    listPaymentTermsApplications: tool({
      description:
        'List customer applications for payment terms (pay by invoice) across the platform.' +
        ' Defaults to the ones waiting for review. Use when the operator asks what needs reviewing.',
      inputSchema: z.object({
        phase: z
          .enum(['Pending', 'Approved', 'Declined', 'Withdrawn', 'All'])
          .optional()
          .describe('Which applications to list; Pending (awaiting review) when omitted'),
      }),
      execute: async ({ phase = 'Pending' }: { phase?: string }) => {
        const result = await datumGet(
          `${BILLING_ROOT}/billingarrangementapplications?limit=500`,
          accessToken
        );
        if (result.error) return result;

        const applications = filterNotDeleting(
          (result.items ?? []) as ComMiloapisBillingV1Alpha1BillingArrangementApplication[]
        )
          .map((app) => summarizeApplication(app, orgNameFromNamespace(app.metadata?.namespace)))
          .filter((app) => phase === 'All' || app.phase === phase)
          .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));
        return { phase, count: applications.length, applications };
      },
    }),

    getBillingAccountUsage: tool({
      description:
        "Get a billing account's usage and spend for its current or previous billing cycle, by meter." +
        ' Use when the operator asks what an account is spending, what drives its bill, or how usage compares.',
      inputSchema: z.object({
        orgName: z.string().describe('The organization resource name'),
        billingAccountName: z.string().describe('The billing account resource name'),
        cycle: z
          .enum(['current', 'previous'])
          .optional()
          .describe('Which billing cycle; current when omitted'),
      }),
      execute: async ({
        orgName,
        billingAccountName,
        cycle,
      }: {
        orgName: string;
        billingAccountName: string;
        cycle?: 'current' | 'previous';
      }) => {
        const name = normalizeOrgName(orgName);
        try {
          const dashboard = await loadOrgUsageDashboard(name, accessToken, {
            billingAccountParam: billingAccountName,
            cycleParam: cycle,
          });
          return {
            ...summarizeUsage(dashboard),
            url: billingAccountRoutes.detail(name, billingAccountName),
          };
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Failed to load usage' };
        }
      },
    }),

    listOffers: tool({
      description:
        'List the offers (pricing plans) billing accounts can be put on, and which is the default.' +
        " Offers made for one account's contract are left out unless asked for.",
      inputSchema: z.object({
        includeContracts: z
          .boolean()
          .optional()
          .describe("Also list offers made for individual accounts' contracts"),
      }),
      execute: async ({ includeContracts = false }: { includeContracts?: boolean }) => {
        const [offersResult, defaultName] = await Promise.all([
          datumGet(`${BILLING_ROOT}/offers?limit=500`, accessToken),
          defaultOfferName(accessToken),
        ]);
        if (offersResult.error) return offersResult;

        const offers = filterNotDeleting(
          (offersResult.items ?? []) as ComMiloapisBillingV1Alpha1Offer[]
        ).filter((offer) => includeContracts || !isContractOffer(offer));
        return {
          defaultOffer: defaultName || null,
          offers: offers.map((offer) => summarizeOffer(offer, defaultName)),
        };
      },
    }),

    getOffer: tool({
      description:
        'Get an offer and every price it charges: usage rates, one-time and monthly fees, and discounts.' +
        ' Use when the operator asks what an offer or plan costs.',
      inputSchema: z.object({
        offerName: z.string().describe('The offer resource name'),
      }),
      execute: async ({ offerName }: { offerName: string }) => {
        const [offerResult, defaultName] = await Promise.all([
          datumGet(`${BILLING_ROOT}/offers/${offerName}`, accessToken),
          defaultOfferName(accessToken),
        ]);
        if (offerResult.error) return offerResult;
        return summarizeOffer(offerResult as ComMiloapisBillingV1Alpha1Offer, defaultName, {
          withPrices: true,
        });
      },
    }),
  };
}

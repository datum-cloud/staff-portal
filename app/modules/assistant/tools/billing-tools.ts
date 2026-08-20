import { datumGet } from './api-helpers';
import { projectDisplayName } from './display-name';
import {
  buildOrganizationNamespace,
  getActiveBindingsForAccount,
  getActiveProjectBinding,
  getBillingAccountDisplayName,
  isDefaultPaymentMethod,
  orgNameFromNamespace,
} from '@/features/billing/utils';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingAccountBinding,
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
        'Get details for a specific billing account including linked projects and default payment method.',
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
        const [accountResult, bindingsResult, paymentMethodsResult] = await Promise.all([
          datumGet(orgBillingPath(name, `billingaccounts/${billingAccountName}`), accessToken),
          datumGet(orgBillingPath(name, 'billingaccountbindings'), accessToken),
          datumGet(orgBillingPath(name, 'paymentmethods'), accessToken),
        ]);
        if (accountResult.error) return accountResult;

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
  };
}

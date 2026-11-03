import { getBillingAccountDetailMetadata, useBillingAccountDetailData } from '../shared';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayId, DisplayName } from '@/components/display';
import { PageHeader } from '@/components/page-header';
import { OfferSwitcherCard, PaymentTermsCard } from '@/features/billing';
import {
  BILLING_ACCOUNT_SECTION_IDS,
  BillingAccountAttentionBanner,
  BillingAccountHeader,
  BillingAccountHealthCards,
  useAccountInvoices,
  useAccountPaymentMethods,
  type BillingAccountHeaderAction,
} from '@/features/billing/components/billing-account-dashboard';
import {
  formatBillingAddress,
  getActiveBindingsForAccount,
  getBillingAccountDisplayStatus,
  getPaymentMethodDisplayName,
  invoiceMatchesSearch,
  isDefaultPaymentMethod,
  toPastInvoiceRow,
  type PastInvoiceRow,
  type PastInvoiceStatus,
} from '@/features/billing/utils';
import {
  EMBEDDED_TABLE_BODY_CLASS,
  EMBEDDED_TABLE_CELL_CLASS,
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_ROW_CLASS,
  ListColumnHeader,
  SectionCard,
  TableCard,
} from '@/features/milo';
import { useEnv } from '@/hooks';
import {
  useBillingAccountBindingListForOrgQuery,
  useBillingAccountDetailQuery,
  useBillingEntitlementForAccountQuery,
  useOrgProjectListQuery,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper, type ColumnDef } from '@/utils/table';
import { Button } from '@datum-cloud/datum-ui/button';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Input } from '@datum-cloud/datum-ui/input';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingAccountBinding,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo, useState, type ReactNode } from 'react';
import { type MetaFunction } from 'react-router';

export const meta: MetaFunction = ({ matches }) => {
  const { displayName } = getBillingAccountDetailMetadata(matches);
  return metaObject(displayName ? `${displayName} - Billing Account` : t`Billing Account`);
};

const paymentMethodColumnHelper = createColumnHelper<ComMiloapisBillingV1Alpha1PaymentMethod>();
const bindingColumnHelper = createColumnHelper<ComMiloapisBillingV1Alpha1BillingAccountBinding>();
const invoiceColumnHelper = createColumnHelper<PastInvoiceRow>();

const invoiceStatusBadgeState: Record<PastInvoiceStatus, string> = {
  paid: 'success',
  open: 'warning',
  pastDue: 'error',
  void: 'pending',
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Placeholder rows while a table's data loads. */
function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <Skeleton className="h-8 w-full rounded" />
      <Skeleton className="h-8 w-full rounded" />
      <Skeleton className="h-8 w-full rounded" />
    </div>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <Text className="text-muted-foreground px-4 py-6">{children}</Text>;
}

function SectionAnchor({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-4">
      {children}
    </div>
  );
}

export default function Page() {
  const { account, orgName, orgDisplayName } = useBillingAccountDetailData();

  if (!account) {
    return (
      <div className="m-4">
        <PageHeader title={t`Billing Account`} />
        <SectionCard className="mt-4" contentClassName="py-6">
          <Text>
            <Trans>Billing account not found or you do not have permission to view it.</Trans>
          </Text>
        </SectionCard>
      </div>
    );
  }

  return <Dashboard orgName={orgName} orgDisplayName={orgDisplayName} loaderAccount={account} />;
}

/**
 * The loader only fetched the account. Everything else loads here on the
 * client, card by card, so the route change never waits on it.
 */
function Dashboard({
  orgName,
  orgDisplayName,
  loaderAccount,
}: {
  orgName: string;
  orgDisplayName: string;
  loaderAccount: ComMiloapisBillingV1Alpha1BillingAccount;
}) {
  const accountName = loaderAccount.metadata?.name ?? '';
  // Fixed for the page's life: the usage comparison's query key depends on it.
  const [now] = useState(() => new Date());
  const env = useEnv();

  const accountQuery = useBillingAccountDetailQuery(orgName, accountName, loaderAccount);
  const account = accountQuery.data ?? loaderAccount;
  const { invoices, isLoading: invoicesLoading } = useAccountInvoices(orgName, accountName);
  const { paymentMethods, isLoading: paymentMethodsLoading } = useAccountPaymentMethods(
    orgName,
    account
  );
  const bindingsQuery = useBillingAccountBindingListForOrgQuery(orgName);
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  const projectsQuery = useOrgProjectListQuery(orgName);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const projectDisplayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projectsQuery.data?.items ?? []) {
      map.set(project.name, project.displayName || project.name);
    }
    return map;
  }, [projectsQuery.data?.items]);

  const pastInvoices = useMemo(
    () =>
      (invoices ?? []).map(toPastInvoiceRow).sort((a, b) => {
        const aTime = Date.parse(a.dateSortKey);
        const bTime = Date.parse(b.dateSortKey);
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
      }),
    [invoices]
  );

  const filteredInvoices = useMemo(
    () => pastInvoices.filter((invoice) => invoiceMatchesSearch(invoice, invoiceSearch)),
    [pastInvoices, invoiceSearch]
  );

  const hasInvoiceSearch = invoiceSearch.trim().length > 0;
  const contactInfo = account.spec?.contactInfo;
  const paymentTerms = account.spec?.paymentTerms;
  const activeBindings = getActiveBindingsForAccount(bindingsQuery.data?.items ?? [], accountName);
  const accountDisplayStatus = getBillingAccountDisplayStatus(account, paymentMethods ?? []);
  const cloudPortalUrl =
    env?.CLOUD_PORTAL_URL && orgName ? `${env.CLOUD_PORTAL_URL}/org/${orgName}/billing` : null;

  const headerActions: BillingAccountHeaderAction[] = [
    {
      key: 'payment-terms',
      label: <Trans>Grant or change payment terms</Trans>,
      onSelect: () => scrollToSection(BILLING_ACCOUNT_SECTION_IDS.paymentTerms),
    },
    {
      key: 'offer',
      label: <Trans>Switch offer</Trans>,
      onSelect: () => scrollToSection(BILLING_ACCOUNT_SECTION_IDS.offer),
    },
  ];

  const paymentMethodColumns = [
    paymentMethodColumnHelper.display({
      id: 'displayName',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => <DisplayName displayName={getPaymentMethodDisplayName(row.original)} />,
    }),
    paymentMethodColumnHelper.display({
      id: 'card',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Card`} />,
      cell: ({ row }) => {
        const card = row.original.status?.details?.card;
        if (!card) return <Text>—</Text>;
        const brand = card.brand ?? 'Card';
        const last4 = card.last4 ? `•••• ${card.last4}` : '';
        const expiry =
          card.expiryMonth && card.expiryYear
            ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`
            : '';
        return <Text>{[brand, last4, expiry].filter(Boolean).join(' · ')}</Text>;
      },
    }),
    paymentMethodColumnHelper.accessor('status.phase', {
      id: 'phase',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
    }),
    paymentMethodColumnHelper.display({
      id: 'default',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Default`} />,
      cell: ({ row }) => (
        <Text>{isDefaultPaymentMethod(row.original, account) ? t`Yes` : t`No`}</Text>
      ),
    }),
  ];

  const bindingColumns = [
    bindingColumnHelper.display({
      id: 'project',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Project`} />,
      cell: ({ row }) => {
        const projectName = row.original.spec?.projectRef?.name ?? '';
        if (!projectName) return <Text>—</Text>;
        const projectDisplayName = projectDisplayNames.get(projectName) ?? projectName;
        return (
          <DisplayName displayName={projectDisplayName} to={projectRoutes.detail(projectName)} />
        );
      },
    }),
    bindingColumnHelper.display({
      id: 'establishedAt',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Established`} />,
      cell: ({ row }) => (
        <DateTime date={row.original.status?.billingResponsibility?.establishedAt} />
      ),
    }),
    bindingColumnHelper.accessor('status.phase', {
      id: 'phase',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
    }),
  ];

  const invoiceColumns = [
    invoiceColumnHelper.accessor('date', {
      id: 'date',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Date`} />,
      sortFn: (a, b) => {
        const aTime = Date.parse(a.original.dateSortKey);
        const bTime = Date.parse(b.original.dateSortKey);
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return aTime - bTime;
      },
      cell: ({ getValue }) => <Text>{getValue()}</Text>,
    }),
    invoiceColumnHelper.accessor('amount', {
      id: 'amount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Amount`} />,
      sortFn: (a, b) => a.original.amountSortKey - b.original.amountSortKey,
      cell: ({ getValue }) => <Text>{getValue()}</Text>,
    }),
    invoiceColumnHelper.accessor('invoiceNumber', {
      id: 'invoiceNumber',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Invoice`} />,
      cell: ({ getValue }) => <DisplayId value={getValue()} />,
    }),
    invoiceColumnHelper.accessor('status', {
      id: 'status',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => (
        <BadgeState
          state={invoiceStatusBadgeState[row.original.status]}
          message={row.original.statusLabel}
        />
      ),
    }),
    invoiceColumnHelper.display({
      id: 'download',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Download`} />,
      cell: ({ row }) => {
        const url = row.original.downloadUrl;
        if (!url) {
          return (
            <Button type="secondary" theme="borderless" size="small" disabled>
              <ACTION_ICONS.download className="size-4" />
              <span className="sr-only">
                <Trans>Download unavailable</Trans>
              </span>
            </Button>
          );
        }
        return (
          <Button
            type="secondary"
            theme="borderless"
            size="small"
            icon={<ACTION_ICONS.download className="size-4" />}
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
            <span className="sr-only">
              <Trans>Download invoice</Trans>
            </span>
          </Button>
        );
      },
    }),
  ];

  return (
    <div className="m-4 flex flex-col gap-4">
      <BillingAccountHeader
        orgName={orgName}
        orgDisplayName={orgDisplayName}
        account={account}
        cloudPortalUrl={cloudPortalUrl}
        actions={headerActions}
        now={now}
      />

      <BillingAccountAttentionBanner
        orgName={orgName}
        account={account}
        cloudPortalUrl={cloudPortalUrl}
        now={now}
      />

      <BillingAccountHealthCards orgName={orgName} account={account} now={now} />

      <div className="grid grid-cols-1 items-start gap-4 @5xl/main:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SectionAnchor id={BILLING_ACCOUNT_SECTION_IDS.invoices}>
            <TableCard
              title={<Trans>Past invoices</Trans>}
              action={
                pastInvoices.length > 0 ? (
                  <Input
                    value={invoiceSearch}
                    onChange={(event) => setInvoiceSearch(event.target.value)}
                    placeholder={t`Search invoices`}
                    className="h-9 w-56"
                    aria-label={t`Search invoices`}
                  />
                ) : undefined
              }>
              {invoicesLoading ? (
                <TableSkeleton />
              ) : pastInvoices.length === 0 ? (
                <EmptyText>
                  <Trans>No invoices yet</Trans>
                </EmptyText>
              ) : filteredInvoices.length === 0 && hasInvoiceSearch ? (
                <EmptyText>
                  <Trans>No invoices match your search</Trans>
                </EmptyText>
              ) : (
                <DataTable.Client
                  data={filteredInvoices}
                  columns={invoiceColumns as ColumnDef<PastInvoiceRow, unknown>[]}
                  pageSize={10}
                  getRowId={(row) => row.id}>
                  <DataTable.Content
                    headerClassName={LIST_TABLE_HEADER_CLASS}
                    headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
                    headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
                    bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
                    rowClassName={LIST_TABLE_ROW_CLASS}
                    cellClassName={EMBEDDED_TABLE_CELL_CLASS}
                    emptyMessage={t`No invoices`}
                  />
                </DataTable.Client>
              )}
            </TableCard>
          </SectionAnchor>

          <TableCard title={<Trans>Linked projects</Trans>}>
            {bindingsQuery.isLoading ? (
              <TableSkeleton />
            ) : activeBindings.length === 0 ? (
              <EmptyText>
                <Trans>No linked projects</Trans>
              </EmptyText>
            ) : (
              <DataTable.Client
                data={activeBindings}
                columns={
                  bindingColumns as ColumnDef<
                    ComMiloapisBillingV1Alpha1BillingAccountBinding,
                    unknown
                  >[]
                }
                pageSize={10}
                getRowId={(row) => row.metadata?.name ?? ''}>
                <DataTable.Content
                  headerClassName={LIST_TABLE_HEADER_CLASS}
                  headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
                  headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
                  bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
                  rowClassName={LIST_TABLE_ROW_CLASS}
                  cellClassName={EMBEDDED_TABLE_CELL_CLASS}
                  emptyMessage={t`No linked projects`}
                />
              </DataTable.Client>
            )}
          </TableCard>

          <TableCard title={<Trans>Payment methods</Trans>}>
            {paymentMethodsLoading ? (
              <TableSkeleton />
            ) : !paymentMethods?.length ? (
              <EmptyText>
                <Trans>No payment methods</Trans>
              </EmptyText>
            ) : (
              <DataTable.Client
                data={paymentMethods}
                columns={
                  paymentMethodColumns as ColumnDef<
                    ComMiloapisBillingV1Alpha1PaymentMethod,
                    unknown
                  >[]
                }
                pageSize={10}
                getRowId={(row) => row.metadata?.name ?? ''}>
                <DataTable.Content
                  headerClassName={LIST_TABLE_HEADER_CLASS}
                  headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
                  headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
                  bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
                  rowClassName={LIST_TABLE_ROW_CLASS}
                  cellClassName={EMBEDDED_TABLE_CELL_CLASS}
                  emptyMessage={t`No payment methods`}
                />
              </DataTable.Client>
            )}
          </TableCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <SectionAnchor id={BILLING_ACCOUNT_SECTION_IDS.paymentTerms}>
            <PaymentTermsCard orgName={orgName} account={account} />
          </SectionAnchor>

          <SectionAnchor id={BILLING_ACCOUNT_SECTION_IDS.offer}>
            {entitlementQuery.isLoading ? (
              <SectionCard title={<Trans>Active Offer</Trans>}>
                <Skeleton className="h-5 w-40 rounded" />
              </SectionCard>
            ) : (
              <OfferSwitcherCard
                orgName={orgName}
                accountName={accountName}
                billingEntitlement={entitlementQuery.data ?? null}
              />
            )}
          </SectionAnchor>

          <SectionCard title={<Trans>Contact & address</Trans>}>
            <DescriptionList
              items={[
                {
                  label: <Trans>Contact name</Trans>,
                  value: <Text>{contactInfo?.name ?? '—'}</Text>,
                },
                {
                  label: <Trans>Company</Trans>,
                  value: <Text>{contactInfo?.businessName ?? '—'}</Text>,
                },
                {
                  label: <Trans>Primary email</Trans>,
                  value: <Text>{contactInfo?.email ?? '—'}</Text>,
                },
                {
                  label: <Trans>Invoice recipients</Trans>,
                  value: (
                    <Text>
                      {contactInfo?.invoiceEmails?.length
                        ? contactInfo.invoiceEmails.join(', ')
                        : '—'}
                    </Text>
                  ),
                },
                {
                  label: <Trans>Billing address</Trans>,
                  value: (
                    <Text className="whitespace-pre-line">
                      {formatBillingAddress(contactInfo?.address) || '—'}
                    </Text>
                  ),
                },
                {
                  label: <Trans>Tax IDs</Trans>,
                  value: (
                    <Text>
                      {account.spec?.taxIds?.length
                        ? account.spec.taxIds
                            .map(
                              (taxId: { type?: string; value?: string }) =>
                                `${taxId.type}: ${taxId.value}`
                            )
                            .join(', ')
                        : '—'}
                    </Text>
                  ),
                },
              ]}
            />
          </SectionCard>

          <SectionCard title={<Trans>Configuration</Trans>}>
            <DescriptionList
              items={[
                {
                  label: <Trans>Status</Trans>,
                  value: paymentMethodsLoading ? (
                    <Skeleton className="h-4 w-14 rounded" />
                  ) : (
                    <BadgeState
                      state={accountDisplayStatus.state}
                      tooltip={accountDisplayStatus.tooltip}
                    />
                  ),
                },
                {
                  label: <Trans>Currency</Trans>,
                  value: <Text>{account.spec?.currencyCode ?? '—'}</Text>,
                },
                {
                  label: <Trans>Invoice frequency</Trans>,
                  value: <Text>{paymentTerms?.invoiceFrequency ?? '—'}</Text>,
                },
                {
                  label: <Trans>Net days</Trans>,
                  value: <Text>{paymentTerms?.netDays ?? '—'}</Text>,
                },
                {
                  label: <Trans>Invoice day of month</Trans>,
                  value: <Text>{paymentTerms?.invoiceDayOfMonth ?? '—'}</Text>,
                },
                {
                  label: <Trans>Linked projects</Trans>,
                  value: <Text>{account.status?.linkedProjectsCount ?? 0}</Text>,
                },
                {
                  label: <Trans>Created</Trans>,
                  value: <DateTime date={account.metadata?.creationTimestamp} variant="both" />,
                },
              ]}
            />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

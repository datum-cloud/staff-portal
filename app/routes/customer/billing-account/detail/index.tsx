import { getBillingAccountDetailMetadata, useBillingAccountDetailData } from '../shared';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayId, DisplayName } from '@/components/display';
import { PageHeader } from '@/components/page-header';
import {
  formatBillingAddress,
  getActiveBindingsForAccount,
  getBillingAccountDisplayName,
  getInvoicesForAccount,
  getOrganizationDisplayName,
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
import { useOrgProjectListQuery } from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { billingAccountRoutes, orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Input } from '@datum-cloud/datum-ui/input';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccountBinding } from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisBillingV1Alpha1PaymentMethod } from '@openapi/billing.miloapis.com/v1alpha1';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
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

export default function Page() {
  const { account, bindings, paymentMethods, invoices, orgName, organization } =
    useBillingAccountDetailData();
  const env = useEnv();
  const projectsQuery = useOrgProjectListQuery(orgName);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const projectDisplayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projectsQuery.data?.items ?? []) {
      map.set(project.name, project.displayName || project.name);
    }
    return map;
  }, [projectsQuery.data?.items]);

  const accountName = account?.metadata?.name;
  const pastInvoices = useMemo(() => {
    if (!accountName) return [];
    return getInvoicesForAccount(invoices ?? [], accountName)
      .map(toPastInvoiceRow)
      .sort((a, b) => {
        const aTime = Date.parse(a.dateSortKey);
        const bTime = Date.parse(b.dateSortKey);
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
      });
  }, [accountName, invoices]);

  const filteredInvoices = useMemo(
    () => pastInvoices.filter((invoice) => invoiceMatchesSearch(invoice, invoiceSearch)),
    [pastInvoices, invoiceSearch]
  );

  const hasInvoiceSearch = invoiceSearch.trim().length > 0;

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

  const displayName = getBillingAccountDisplayName(account);
  const contactInfo = account.spec?.contactInfo;
  const paymentTerms = account.spec?.paymentTerms;
  const activeBindings = getActiveBindingsForAccount(bindings, account.metadata?.name ?? '');
  const cloudPortalUrl =
    env?.CLOUD_PORTAL_URL && orgName ? `${env.CLOUD_PORTAL_URL}/org/${orgName}/billing` : null;
  const orgDisplayName = organization ? getOrganizationDisplayName(organization) : orgName;

  const paymentMethodColumns = [
    paymentMethodColumnHelper.display({
      id: 'displayName',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => <DisplayName displayName={getPaymentMethodDisplayName(row.original)} />,
    }),
    paymentMethodColumnHelper.accessor((row) => row.metadata?.name ?? '', {
      id: 'id',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue()} />,
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
    bindingColumnHelper.accessor((row) => row.spec?.projectRef?.name ?? '', {
      id: 'id',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => {
        const projectName = getValue();
        return projectName ? <DisplayId value={projectName} /> : <Text>—</Text>;
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
      sortingFn: (a, b) => {
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
      sortingFn: (a, b) => a.original.amountSortKey - b.original.amountSortKey,
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={displayName} />
        <div className="flex flex-wrap gap-2">
          {orgName ? (
            <LinkButton type="secondary" theme="outline" href={orgRoutes.detail(orgName)}>
              <Trans>View organization</Trans>
            </LinkButton>
          ) : null}
          {cloudPortalUrl ? (
            <LinkButton
              type="secondary"
              theme="outline"
              href={cloudPortalUrl}
              target="_blank"
              rel="noreferrer"
              icon={<ACTION_ICONS.externalLink className="size-4" />}
              iconPosition="right">
              <Trans>Open in Cloud Portal</Trans>
            </LinkButton>
          ) : null}
          <LinkButton type="secondary" theme="outline" href={billingAccountRoutes.list()}>
            <Trans>All billing accounts</Trans>
          </LinkButton>
        </div>
      </div>

      <Row type="flex" gutter={[16, 16]}>
        <Col span={24} lg={12}>
          <SectionCard className="h-full" title={<Trans>Account overview</Trans>}>
            <DescriptionList
              items={[
                {
                  label: <Trans>Organization</Trans>,
                  value: orgName ? (
                    <DisplayName
                      displayName={orgDisplayName || orgName}
                      to={orgRoutes.detail(orgName)}
                    />
                  ) : (
                    <Text>—</Text>
                  ),
                },
                {
                  label: <Trans>Resource name</Trans>,
                  value: <Text>{account.metadata?.name}</Text>,
                },
                {
                  label: <Trans>Status</Trans>,
                  value: <BadgeState state={account.status?.phase ?? 'Unknown'} />,
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
        </Col>

        <Col span={24} lg={12}>
          <SectionCard className="h-full" title={<Trans>Contact & address</Trans>}>
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
        </Col>
      </Row>

      <TableCard title={<Trans>Payment methods</Trans>}>
        {paymentMethods.length === 0 ? (
          <Text className="text-muted-foreground px-4 py-6">
            <Trans>No payment methods</Trans>
          </Text>
        ) : (
          <DataTable.Client
            data={paymentMethods}
            columns={
              paymentMethodColumns as ColumnDef<ComMiloapisBillingV1Alpha1PaymentMethod, unknown>[]
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
        {pastInvoices.length === 0 ? (
          <Text className="text-muted-foreground px-4 py-6">
            <Trans>No invoices yet</Trans>
          </Text>
        ) : filteredInvoices.length === 0 && hasInvoiceSearch ? (
          <Text className="text-muted-foreground px-4 py-6">
            <Trans>No invoices match your search</Trans>
          </Text>
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

      <TableCard title={<Trans>Linked projects</Trans>}>
        {activeBindings.length === 0 ? (
          <Text className="text-muted-foreground px-4 py-6">
            <Trans>No linked projects</Trans>
          </Text>
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
    </div>
  );
}

import { getBillingAccountDetailMetadata, useBillingAccountDetailData } from '../shared';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayName } from '@/components/display';
import { PageHeader } from '@/components/page-header';
import {
  formatBillingAddress,
  getActiveBindingsForAccount,
  getBillingAccountDisplayName,
  getOrganizationDisplayName,
  getPaymentMethodDisplayName,
  getResourceNameSubtext,
  isDefaultPaymentMethod,
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
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccountBinding } from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisBillingV1Alpha1PaymentMethod } from '@openapi/billing.miloapis.com/v1alpha1';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { type MetaFunction } from 'react-router';

export const meta: MetaFunction = ({ matches }) => {
  const { displayName } = getBillingAccountDetailMetadata(matches);
  return metaObject(displayName ? `${displayName} - Billing Account` : t`Billing Account`);
};

const paymentMethodColumnHelper = createColumnHelper<ComMiloapisBillingV1Alpha1PaymentMethod>();
const bindingColumnHelper = createColumnHelper<ComMiloapisBillingV1Alpha1BillingAccountBinding>();

export default function Page() {
  const { account, bindings, paymentMethods, orgName, organization } =
    useBillingAccountDetailData();
  const env = useEnv();
  const projectsQuery = useOrgProjectListQuery(orgName);

  const projectDisplayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projectsQuery.data?.items ?? []) {
      map.set(project.name, project.displayName || project.name);
    }
    return map;
  }, [projectsQuery.data?.items]);

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
      cell: ({ row }) => {
        const methodDisplayName = getPaymentMethodDisplayName(row.original);
        const methodName = row.original.metadata?.name ?? '';
        return (
          <DisplayName
            displayName={methodDisplayName}
            name={getResourceNameSubtext(methodDisplayName, methodName)}
          />
        );
      },
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
          <DisplayName
            displayName={projectDisplayName}
            name={getResourceNameSubtext(projectDisplayName, projectName)}
            to={projectRoutes.detail(projectName)}
          />
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
                      name={getResourceNameSubtext(orgDisplayName || orgName, orgName)}
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
                  label: <Trans>Business name</Trans>,
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

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
  isDefaultPaymentMethod,
} from '@/features/billing/utils';
import { useEnv } from '@/hooks';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { financeRoutes, orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccountBinding } from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisBillingV1Alpha1PaymentMethod } from '@openapi/billing.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Link, type MetaFunction } from 'react-router';

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

  if (!account) {
    return (
      <div className="m-4">
        <PageHeader title={t`Billing Account`} />
        <Card className="mt-4 shadow-none">
          <CardContent className="py-6">
            <Text>
              <Trans>Billing account not found or you do not have permission to view it.</Trans>
            </Text>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getBillingAccountDisplayName(account);
  const contactInfo = account.spec?.contactInfo;
  const paymentTerms = account.spec?.paymentTerms;
  const activeBindings = getActiveBindingsForAccount(bindings, account.metadata?.name ?? '');
  const cloudPortalUrl =
    env?.CLOUD_PORTAL_URL && orgName ? `${env.CLOUD_PORTAL_URL}/org/${orgName}/billing` : null;

  const paymentMethodColumns = [
    paymentMethodColumnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue }) => <Text>{getValue()}</Text>,
    }),
    paymentMethodColumnHelper.display({
      id: 'card',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Card`} />,
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
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
    }),
    paymentMethodColumnHelper.display({
      id: 'default',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Default`} />,
      cell: ({ row }) => (
        <Text>{isDefaultPaymentMethod(row.original, account) ? t`Yes` : t`No`}</Text>
      ),
    }),
  ];

  const bindingColumns = [
    bindingColumnHelper.accessor('spec.projectRef.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Project`} />,
      cell: ({ getValue }) => {
        const projectName = getValue() ?? '';
        if (!projectName) return <Text>—</Text>;
        return (
          <Link to={projectRoutes.detail(projectName)} className="text-primary hover:underline">
            {projectName}
          </Link>
        );
      },
    }),
    bindingColumnHelper.display({
      id: 'establishedAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Established`} />,
      cell: ({ row }) => (
        <DateTime date={row.original.status?.billingResponsibility?.establishedAt} />
      ),
    }),
    bindingColumnHelper.accessor('status.phase', {
      id: 'phase',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
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
          <LinkButton type="secondary" theme="outline" href={financeRoutes.billingAccounts.list()}>
            <Trans>All billing accounts</Trans>
          </LinkButton>
        </div>
      </div>

      <Row type="flex" gutter={[16, 16]}>
        <Col span={24} lg={12}>
          <Card className="h-full shadow-none">
            <CardHeader>
              <CardTitle>
                <Trans>Account overview</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                items={[
                  {
                    label: <Trans>Organization</Trans>,
                    value: orgName ? (
                      <DisplayName
                        displayName={
                          organization ? getOrganizationDisplayName(organization) : orgName
                        }
                        name={orgName}
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
                    label: <Trans>Phase</Trans>,
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
            </CardContent>
          </Card>
        </Col>

        <Col span={24} lg={12}>
          <Card className="h-full shadow-none">
            <CardHeader>
              <CardTitle>
                <Trans>Contact & address</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>Payment methods</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <Text>
              <Trans>No payment methods</Trans>
            </Text>
          ) : (
            <DataTable.Client
              data={paymentMethods}
              columns={paymentMethodColumns}
              pageSize={10}
              getRowId={(row) => row.metadata?.name ?? ''}>
              <DataTable.Content
                headerClassName="bg-muted/50"
                className="border-t border-b border-solid"
                emptyMessage={t`No payment methods`}
              />
            </DataTable.Client>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>Linked projects</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeBindings.length === 0 ? (
            <Text>
              <Trans>No linked projects</Trans>
            </Text>
          ) : (
            <DataTable.Client
              data={activeBindings}
              columns={bindingColumns}
              pageSize={10}
              getRowId={(row) => row.metadata?.name ?? ''}>
              <DataTable.Content
                headerClassName="bg-muted/50"
                className="border-t border-b border-solid"
                emptyMessage={t`No linked projects`}
              />
            </DataTable.Client>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

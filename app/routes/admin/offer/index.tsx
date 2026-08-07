import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayId, DisplayName } from '@/components/display';
import { formatChargeTypes, getOfferDisplayName } from '@/features/billing/utils';
import { ListColumnHeader, ListPage, ListTable } from '@/features/milo';
import { useBillingDefaultOfferQuery, useOfferListQuery } from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { offerRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1Offer } from '@openapi/billing.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Offers`);
};

const columnHelper = createColumnHelper<ComMiloapisBillingV1Alpha1Offer>();

export default function Page() {
  const tableQuery = useOfferListQuery({ limit: 500 });
  const defaultOfferQuery = useBillingDefaultOfferQuery();
  const defaultOfferName = defaultOfferQuery.data ?? '';

  const columns = [
    columnHelper.accessor((row) => row.metadata?.name ?? '', {
      id: 'id',
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue()} />,
    }),
    columnHelper.accessor((row) => getOfferDisplayName(row), {
      id: 'name',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue, row }) => {
        const offerName = row.original.metadata?.name ?? '';
        return (
          <div className="flex items-center gap-2">
            <DisplayName displayName={getValue()} to={offerRoutes.detail(offerName)} />
            {defaultOfferName && offerName === defaultOfferName ? (
              <BadgeState state="Default" />
            ) : null}
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => row.spec?.launchStage ?? '', {
      id: 'launchStage',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Stage`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() || 'Unknown'} />,
    }),
    columnHelper.accessor((row) => formatChargeTypes(row.spec?.chargeTypes ?? []), {
      id: 'chargeTypes',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Charge types`} />,
      cell: ({ getValue }) => getValue() || '—',
    }),
    columnHelper.accessor((row) => row.status?.publishedAt, {
      id: 'publishedAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Published`} />,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <DateTime date={value} /> : '—';
      },
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <ListPage>
      <ListTable
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={50}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchPlaceholder={t`Search offers...`}
        emptyMessage={t`No offers found.`}
        actions={
          <LinkButton
            type="primary"
            href={offerRoutes.create()}
            icon={<ACTION_ICONS.add size={16} />}>
            <Trans>Create Offer</Trans>
          </LinkButton>
        }
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          const name = (row.metadata?.name ?? '').toLowerCase();
          const displayName = getOfferDisplayName(row).toLowerCase();
          const stage = (row.spec?.launchStage ?? '').toLowerCase();
          return name.includes(q) || displayName.includes(q) || stage.includes(q);
        }}
      />
    </ListPage>
  );
}

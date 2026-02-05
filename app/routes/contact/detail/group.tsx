import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/index';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { contactMembershipForContactListQuery } from '@/resources/request/client';
import {
  ContactMembershipListWithContactGroups,
  ContactMembershipWithContactGroup,
} from '@/resources/schemas';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

export const handle = {
  breadcrumb: () => <Trans>Groups</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Groups - ${contactName}`);
};

const columnHelper = createColumnHelper<ContactMembershipWithContactGroup>();
const columns = [
  columnHelper.display({
    id: 'name',
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const contactGroup = row.original.contactGroup;
      const contactGroupName = contactGroup?.metadata?.name ?? '';
      const displayName = contactGroup?.spec?.displayName ?? '';

      return (
        <DisplayName
          displayName={displayName}
          name={contactGroupName}
          to={contactGroupRoutes.detail(contactGroupName)}
        />
      );
    },
  }),
  columnHelper.display({
    id: 'visibility',
    header: () => <Trans>Visibility</Trans>,
    cell: ({ row }) => {
      const contactGroup = row.original.contactGroup;
      return <BadgeState state={contactGroup?.spec?.visibility ?? 'public'} />;
    },
  }),
  columnHelper.display({
    id: 'status',
    header: () => <Trans>Status</Trans>,
    cell: ({ row }) => {
      const contactGroup = row.original.contactGroup;
      return (
        <BadgeCondition
          status={contactGroup?.status ?? null}
          multiple={false}
          showMessage
          className="text-xs"
        />
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Joined</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

export default function Page() {
  const data = useContactDetailData();

  const tableState = useDataTableQuery<ContactMembershipListWithContactGroups>({
    queryKeyPrefix: ['contacts', data.contact?.metadata?.name ?? '', 'groups'],
    fetchFn: (params) =>
      contactMembershipForContactListQuery({
        ...params,
        filters: { fieldSelector: `spec.contactRef.name=${data.contact?.metadata?.name ?? ''}` },
      }),
    useSorting: true,
  });

  return (
    <DataTableProvider<ContactMembershipWithContactGroup, ContactMembershipListWithContactGroups>
      {...tableState}
      columns={columns}
      transform={(data) => ({
        rows: data.items || [],
        cursor: data.metadata?.continue,
      })}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable />
      </div>
    </DataTableProvider>
  );
}

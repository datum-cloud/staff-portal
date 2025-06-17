import type { Route } from './+types/organization';
import { DataTable } from '@/modules/shadcn/ui/data-table';
import { useOrgQuery } from '@/resources/api/organization.resource';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@tanstack/react-table';

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  visits: number;
  status: string;
  progress: number;
};

const columnHelper = createColumnHelper<Person>();
const columns = [
  columnHelper.accessor('firstName', {
    header: 'First Name',
    cell: (info) => info.getValue(),
  }),
];

export const meta: Route.MetaFunction = () => {
  return metaObject('Organizations');
};

export const handle = {
  breadcrumb: () => <span>Organizations</span>,
};

export default function CustomerOrganization() {
  const { data } = useOrgQuery();

  return (
    <DataTable
      columns={columns}
      data={[
        {
          firstName: 'John',
          lastName: 'Doe',
          age: 25,
          visits: 10,
          status: 'active',
          progress: 50,
        },
      ]}
    />
  );
}

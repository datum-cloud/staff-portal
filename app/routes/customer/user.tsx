import type { Route } from "./+types/user";
import AppActionBar from "@/components/app-actiobar";
import UIDDisplay from "@/components/uid-display";
import { DataTable } from "@/modules/data-table/components/data-table";
import { useDataTableQuery } from "@/modules/data-table/hooks/useDataTableQuery";
import { DataTableProvider } from "@/modules/data-table/providers/data-table.provider";
import { Button } from "@/modules/shadcn/ui/button";
import { userQuery } from "@/resources/request/client/user.request";
import { User, UserResponse } from "@/resources/schemas/user.schema";
import { metaObject } from "@/utils/helpers";
import { createColumnHelper } from "@tanstack/react-table";
import { PlusIcon } from "lucide-react";
import { Link } from "react-router";

export const meta: Route.MetaFunction = () => {
  return metaObject("Users");
};

export const handle = {
  breadcrumb: () => <span>Users</span>,
};

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor("spec.givenName", {
    header: "Name",
    cell: ({ row }) => {
      return (
        <Link to={`/customers/users/${row.original.metadata.uid}`}>
          {row.original.spec.givenName} {row.original.spec.familyName}
        </Link>
      );
    },
  }),
  columnHelper.accessor("spec.email", {
    header: "Email",
  }),
  columnHelper.accessor("metadata.uid", {
    header: "UID",
    cell: ({ getValue }) => {
      return <UIDDisplay uuid={getValue()} />;
    },
  }),
];

export default function CustomerUser() {
  const tableState = useDataTableQuery<UserResponse>({
    queryKeyPrefix: "users",
    fetchFn: userQuery,
    useSorting: true,
    useGlobalFilter: true,
  });

  return (
    <DataTableProvider<User, UserResponse>
      columns={columns}
      transform={(data) => {
        return {
          rows: data?.data?.items || [],
          cursor: data?.data?.metadata?.continue,
        };
      }}
      {...tableState}
    >
      <AppActionBar>
        <Button>
          <PlusIcon />
          New
        </Button>
      </AppActionBar>

      <div className="m-4 flex flex-col gap-2">
        <DataTable<User> />
      </div>
    </DataTableProvider>
  );
}

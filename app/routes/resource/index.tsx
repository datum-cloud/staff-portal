import type { Route } from './+types/index';
import { apiRequest } from '@/modules/axios/axios.server';
import { Button } from '@/modules/shadcn/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { uiConfig } from '@/ui.config';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { JSONPath } from 'jsonpath-plus';
import { data, useLoaderData } from 'react-router';

interface CustomResourceDefinition {
  spec: {
    group: string;
    names: {
      kind: string;
      plural: string;
    };
    versions: Array<{
      name: string;
      storage: boolean;
      additionalPrinterColumns?: Array<unknown>;
    }>;
  };
}

const basePath =
  'apis/resourcemanager.datumapis.com/v1alpha/projects/testing-with-labels-j3uhn3/control-plane/apis';
const token =
  'eyJhbGciOiJSUzI1NiIsImtpZCI6IjMyNDk5OTA2Mzc0NzQyOTM5MCIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiMzIwMTY2MzUxNDEyOTg4NzMwIiwiMzIwNzI4NDE5MjcwNzIzODcxIiwiMzIwMTY2MzUxMzc5NDM0ODk3IiwiMzIwMTY2MzUxMTI3NzEyMjQwIl0sImNsaWVudF9pZCI6IjMyMDE2NjM1MTQxMjk4ODczMCIsImVtYWlsIjoieWFoeWEuZmFraHJvamlAZ21haWwuY29tIiwiZXhwIjoxNzUwMjYxNDUxLCJpYXQiOjE3NTAyMTgyNTEsImlzcyI6Imh0dHBzOi8vYXV0aC5zdGFnaW5nLmVudi5kYXR1bS5uZXQiLCJqdGkiOiJWMl8zMjUwMTIwMDU2MjQ3NDI5MjYtYXRfMzI1MDEyMDA1NjI0ODA4NDYyIiwibmJmIjoxNzUwMjE4MjUxLCJzdWIiOiIzMjAyMTQ4NjYxNTU1Mzk4NTcifQ.FOZfKGDwdQFNU6JczIEL1hzDrT3WOldbcjHMjG_9yHm17FIlWuYcXGm83aJebyV8muHI0oraEanW31zQAZFJwodyoxCEUh2pAT_I27x_BB5_xX4u52CnnOCBgNeUoL-AXuLuax5BVmGNKh4-NQArjcdokgo0K8NXlrLc9WjpWgocOJ3t80Pn2eCAqJx8ipOqVfKljIZNEf_kzxa2x0UMAVqHdS1IWt4t3qEE0n_NUtnz0FhgD8Dmy4KCdBffqyjmVtxlR2fhi2VMY2d8ALSt_UoKpPEYB8nCNcuVRRag0IisON0KcWaeTJ69aw1-l9KFOOHNv72tVnrYFk0B8kLcOg';

export async function loader({ params }: Route.LoaderArgs) {
  const { group, kind } = params;

  const crds: any = await apiRequest({
    method: 'GET',
    url: `${basePath}/apiextensions.k8s.io/v1/customresourcedefinitions`,
    headers: { Authorization: `Bearer ${token}` },
  }).execute();

  const crd = crds.items.find(
    (c: CustomResourceDefinition) =>
      c.spec.group === group && c.spec.names.kind.toLowerCase() === kind?.toLowerCase()
  );

  if (!crd) {
    throw new Response('CRD not found', { status: 404 });
  }

  const version = crd.spec.versions.find((v: { storage: boolean; name: string }) => v.storage).name;
  const plural = crd.spec.names.plural;
  const cols =
    crd.spec.versions.find(
      (v: { name: string; additionalPrinterColumns?: Array<unknown> }) => v.name === version
    )?.additionalPrinterColumns ?? [];

  const resourceList: any = await apiRequest({
    method: 'GET',
    url: `${basePath}/${group}/${version}/${plural}`,
    headers: { Authorization: `Bearer ${token}` },
  }).execute();

  const menu = uiConfig.find((m) => m.resource.group === group && m.resource.kind === kind);

  return data({
    crds,
    group,
    kind,
    columns: cols,
    items: resourceList.items,
    menu,
  });
}

export default function ResourceIndex() {
  const { menu, items, columns, crds } = useLoaderData<typeof loader>();

  const crdsWithColumns = crds.items.filter((crd: CustomResourceDefinition) =>
    crd.spec.versions.some((version: any) => version.additionalPrinterColumns?.length > 0)
  );
  console.log('CRDs with additionalPrinterColumns:', crdsWithColumns);
  console.log('Columns:', columns);
  console.log('Items:', items);

  const columnHelper = createColumnHelper<any>();
  const tableColumns = columns.map((col: any) =>
    columnHelper.accessor(
      (row) => {
        const path = col.jsonPath.startsWith('$') ? col.jsonPath : `$${col.jsonPath}`;
        let val = JSONPath({ path, json: row })[0];
        if (col.type === 'date' && val) {
          val = new Date(val).toLocaleString();
        }
        return val ?? '-';
      },
      {
        id: col.name,
        header: col.name,
      }
    )
  );

  const table = useReactTable({
    data: items,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="text-xl">{menu?.menu.label}</CardTitle>
        <CardDescription>Manage your {menu?.menu.label}.</CardDescription>
        <CardAction>
          <Button variant="secondary" size="sm" className="shadow-none">
            Add {menu?.menu.label}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="border px-2 py-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-t">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="border px-2 py-1">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

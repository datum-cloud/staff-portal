import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListColumnHeader, ListPage, ListTable } from '@/features/milo';
import { useAllProjectSuspensionsQuery } from '@/resources/request/client';
import { suspendedProjectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { t } from '@lingui/core/macro';
import { useMemo } from 'react';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Suspended Projects`);
};

/** One row per project — a project can carry several suspensions at once. */
type SuspendedProjectRow = {
  projectName: string;
  reasons: string[];
  authorities: string[];
  suspendedAt?: string;
  count: number;
};

const columnHelper = createColumnHelper<SuspendedProjectRow>();

export default function Page() {
  const tableQuery = useAllProjectSuspensionsQuery();

  // ProjectSuspension is per-suspension; group to one row per project (a project
  // stays suspended while any exist, and can carry several — e.g. Fraud + Billing).
  const rows = useMemo<SuspendedProjectRow[]>(() => {
    const byProject = new Map<string, SuspendedProjectRow>();
    for (const s of tableQuery.data ?? []) {
      const projectName = s.spec?.projectRef?.name ?? '';
      if (!projectName) continue;
      const row = byProject.get(projectName) ?? {
        projectName,
        reasons: [],
        authorities: [],
        suspendedAt: undefined,
        count: 0,
      };
      const reason = s.spec?.reason;
      if (reason && !row.reasons.includes(reason)) row.reasons.push(reason);
      const authority = s.spec?.reinstateAuthority;
      if (authority && !row.authorities.includes(authority)) row.authorities.push(authority);
      const ts = s.metadata?.creationTimestamp;
      if (ts && (!row.suspendedAt || ts < row.suspendedAt)) row.suspendedAt = ts;
      row.count += 1;
      byProject.set(projectName, row);
    }
    return Array.from(byProject.values());
  }, [tableQuery.data]);

  const columns = [
    columnHelper.accessor('projectName', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Project`} />,
      cell: ({ getValue }) => {
        const name = getValue();
        return <DisplayName displayName={name} to={suspendedProjectRoutes.detail(name)} />;
      },
    }),
    columnHelper.accessor('reasons', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Reason`} />,
      enableSorting: false,
      cell: ({ getValue }) => (
        <div className="flex flex-wrap gap-1">
          {getValue().map((r) => (
            <BadgeState key={r} state={r} />
          ))}
        </div>
      ),
    }),
    columnHelper.accessor('authorities', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Lift authority`} />,
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-sm">{getValue().join(', ') || '—'}</span>,
    }),
    columnHelper.accessor('suspendedAt', {
      id: 'suspendedAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Suspended`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <ListPage>
      <ListTable
        loading={tableQuery.isLoading}
        data={rows}
        columns={columns}
        filters={[
          {
            column: 'reasons',
            type: 'multi',
            label: t`Reason`,
            options: [
              { value: 'Fraud', label: t`Fraud` },
              { value: 'Abuse', label: t`Abuse` },
              { value: 'Billing', label: t`Billing` },
              { value: 'Compliance', label: t`Compliance` },
              { value: 'Administrative', label: t`Administrative` },
            ],
          },
          {
            column: 'authorities',
            type: 'multi',
            label: t`Lift authority`,
            options: [
              { value: 'Operator', label: t`Operator` },
              { value: 'Consumer', label: t`Consumer` },
            ],
          },
        ]}
        pageSize={50}
        getRowId={(row) => row.projectName}
        defaultSort={[{ id: 'suspendedAt', desc: true }]}
        searchPlaceholder={t`Search suspended projects...`}
        emptyMessage={t`No projects are currently suspended.`}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            row.projectName.toLowerCase().includes(q) ||
            row.reasons.some((r) => r.toLowerCase().includes(q))
          );
        }}
      />
    </ListPage>
  );
}

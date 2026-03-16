import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { useFraudEvaluationListQuery } from '@/resources/request/client';
import type { FraudEvaluation } from '@/resources/types/fraud.types';
import { fraudRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Fraud Evaluations`);
};

const columnHelper = createColumnHelper<FraudEvaluation>();

export default function Page() {
  const tableQuery = useFraudEvaluationListQuery();

  const columns = [
    columnHelper.accessor('spec.userRef.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`User`} />,
      cell: ({ row }) => {
        const name = row.original.metadata?.name ?? '';
        return (
          <Link to={fraudRoutes.evaluationDetail(name)} className="text-primary hover:underline">
            <DisplayId value={row.original.spec?.userRef?.name ?? ''} />
          </Link>
        );
      },
    }),
    columnHelper.accessor('spec.policyRef.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Policy`} />,
      cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
    }),
    columnHelper.accessor('status.phase', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Pending'} />,
    }),
    columnHelper.accessor('status.compositeScore', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Score`} />,
      cell: ({ getValue }) => {
        const score = getValue();
        if (!score) return <span className="text-muted-foreground text-sm">-</span>;
        const numScore = parseFloat(score);
        const color =
          numScore >= 70
            ? 'text-red-600 dark:text-red-400'
            : numScore >= 30
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-green-600 dark:text-green-400';
        return <span className={`font-mono text-sm font-medium ${color}`}>{score}</span>;
      },
    }),
    columnHelper.accessor('status.decision', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Decision`} />,
      cell: ({ getValue }) => {
        const decision = getValue();
        if (!decision || decision === 'NONE')
          return <span className="text-muted-foreground text-sm">None</span>;
        return (
          <BadgeState state={decision === 'DEACTIVATE' ? 'error' : 'warning'} message={decision} />
        );
      },
    }),
    columnHelper.accessor('status.enforcementAction', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Enforcement`} />,
      cell: ({ getValue }) => {
        const action = getValue();
        if (!action || action === 'NONE')
          return <span className="text-muted-foreground text-sm">None</span>;
        const stateMap: Record<string, string> = {
          OBSERVED: 'info',
          REVIEW_FLAGGED: 'warning',
          DEACTIVATED: 'error',
        };
        return <BadgeState state={stateMap[action] ?? 'unknown'} message={action} />;
      },
    }),
    columnHelper.accessor('status.lastEvaluationTime', {
      id: 'lastEvaluationTime',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Evaluated`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.metadata?.name ?? ''}
      defaultSort={[{ id: 'lastEvaluationTime', desc: true }]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const userId = (row.spec?.userRef?.name ?? '').toLowerCase();
        const name = (row.metadata?.name ?? '').toLowerCase();
        const decision = (row.status?.decision ?? '').toLowerCase();
        return userId.includes(q) || name.includes(q) || decision.includes(q);
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <div className="flex items-center gap-4">
            <DataTable.Search placeholder={t`Search by user ID...`} className="w-64" />
            <DataTable.SelectFilter
              column="status.phase"
              label={t`Phase`}
              placeholder={t`Filter by phase`}
              options={[
                { value: 'Completed', label: t`Completed` },
                { value: 'Running', label: t`Running` },
                { value: 'Pending', label: t`Pending` },
                { value: 'Error', label: t`Error` },
              ]}
            />
            <DataTable.SelectFilter
              column="status.decision"
              label={t`Decision`}
              placeholder={t`Filter by decision`}
              options={[
                { value: 'NONE', label: t`None` },
                { value: 'REVIEW', label: t`Review` },
                { value: 'DEACTIVATE', label: t`Deactivate` },
              ]}
            />
          </div>

          <DataTable.ActiveFilters
            excludeFilters={['search']}
            filterLabels={{
              'status.phase': t`Phase`,
              'status.decision': t`Decision`,
            }}
          />

          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No fraud evaluations found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}

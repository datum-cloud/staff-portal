import {
  MAX_PROJECT_SPEND_REQUESTS,
  useAccountProjects,
  useAccountProjectSpend,
  type ProjectSpend,
} from '../../hooks';
import { getAccountCurrency, type BillingAccount } from '../../utils';
import { CardMessage, CardQueryState, InlineDate, ShareBar, TableRowsSkeleton } from './card-parts';
import { BadgeState } from '@/components/badge';
import { DisplayName } from '@/components/display';
import {
  EMBEDDED_TABLE_BODY_CLASS,
  EMBEDDED_TABLE_CELL_CLASS,
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_ROW_CLASS,
  ListColumnHeader,
  TABLE_CARD_FOOTER_CLASS,
  TableCard,
} from '@/features/milo';
import { formatCurrency } from '@/features/organization/usage/usage.format';
import { projectRoutes } from '@/utils/config/routes.config';
import { createColumnHelper, type ColumnDef } from '@/utils/table';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

interface ProjectsCardProps {
  orgName: string;
  account: BillingAccount;
}

interface ProjectRow {
  id: string;
  projectName: string;
  displayName: string;
  linkedAt?: string;
  phase?: string;
  spend: ProjectSpend;
  /** Total spend across the projects priced so far, for the share bar. */
  totalSpend: number;
  currency: string;
}

const columnHelper = createColumnHelper<ProjectRow>();

const SpendCellSkeleton = () => <Skeleton className="h-3 w-12 rounded" />;

const columns = [
  columnHelper.display({
    id: 'project',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Project`} />,
    cell: ({ row }) =>
      row.original.projectName ? (
        <DisplayName
          displayName={row.original.displayName}
          to={projectRoutes.detail(row.original.projectName)}
        />
      ) : (
        <Text size="xs">—</Text>
      ),
  }),
  columnHelper.display({
    id: 'linked',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Linked`} />,
    cell: ({ row }) =>
      row.original.linkedAt ? (
        <Text size="xs" className="whitespace-nowrap">
          <InlineDate date={row.original.linkedAt} variant="absolute" format="MMM d, yyyy" />
        </Text>
      ) : (
        <Text size="xs">—</Text>
      ),
  }),
  columnHelper.display({
    id: 'share',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Share of spend`} />,
    cell: ({ row }) => {
      const { spend, totalSpend } = row.original;
      if (spend.isLoading) return <Skeleton className="h-1.5 w-full max-w-60 rounded-full" />;
      if (spend.amount === undefined) return <Text size="xs">—</Text>;
      const percent = totalSpend > 0 ? Math.round((spend.amount / totalSpend) * 100) : 0;
      return (
        <div className="flex max-w-72 items-center gap-3">
          <ShareBar value={spend.amount} max={totalSpend} />
          <Text size="xs" textColor="muted" className="w-9 shrink-0 text-right tabular-nums">
            {percent}%
          </Text>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: 'spend',
    enableSorting: false,
    header: ({ column }) => (
      <div className="text-right">
        <ListColumnHeader column={column} title={t`Spend`} />
      </div>
    ),
    cell: ({ row }) => {
      const { spend, currency } = row.original;
      return (
        <div className="flex justify-end">
          {spend.isLoading ? (
            <SpendCellSkeleton />
          ) : (
            <Text
              size="xs"
              weight="medium"
              className="tabular-nums"
              title={
                spend.isError
                  ? t`Couldn't load spend`
                  : spend.skipped
                    ? t`See the usage dashboard for this project's spend`
                    : undefined
              }>
              {spend.amount === undefined
                ? '—'
                : formatCurrency({ amount: spend.amount, currency })}
            </Text>
          )}
        </div>
      );
    },
  }),
  columnHelper.display({
    id: 'status',
    enableSorting: false,
    header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
    cell: ({ row }) => <BadgeState state={row.original.phase ?? 'Unknown'} />,
  }),
] as ColumnDef<ProjectRow, unknown>[];

/** Projects billed to the account, with each one's spend this cycle. */
export function BillingAccountProjectsCard({ orgName, account }: ProjectsCardProps) {
  const currency = getAccountCurrency(account);
  const { projects, isLoading, isError } = useAccountProjects(orgName, account);
  const projectNames = useMemo(
    () => (projects ?? []).map((project) => project.projectName).filter(Boolean),
    [projects]
  );
  const spendByProject = useAccountProjectSpend(orgName, account, projectNames);

  const skipped = projectNames.filter((name) => spendByProject.get(name)?.skipped).length;
  const totalSpend = projectNames.reduce(
    (sum, name) => sum + (spendByProject.get(name)?.amount ?? 0),
    0
  );
  const rows: ProjectRow[] = (projects ?? [])
    .map(({ binding, projectName, displayName }) => ({
      id: binding.metadata?.name ?? projectName,
      projectName,
      displayName,
      linkedAt: binding.status?.billingResponsibility?.establishedAt,
      phase: binding.status?.phase,
      spend: spendByProject.get(projectName) ?? { isLoading: false, isError: false },
      totalSpend,
      currency,
    }))
    .sort((a, b) => (b.spend.amount ?? -1) - (a.spend.amount ?? -1));

  const subtitle = projects ? (
    <Plural
      value={projects.length}
      one="# active binding · spend this cycle by project"
      other="# active bindings · spend this cycle by project"
    />
  ) : null;

  return (
    <TableCard title={<Trans>Linked projects</Trans>} description={subtitle}>
      <CardQueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={rows.length === 0}
        skeleton={<TableRowsSkeleton />}
        error={<Trans>Couldn&apos;t load linked projects</Trans>}
        empty={<Trans>No linked projects</Trans>}>
        <DataTable.Client
          data={rows}
          columns={columns}
          // One page: spend requests are already capped, so the list stays short.
          pageSize={Math.max(rows.length, 1)}
          getRowId={(row) => row.id}>
          <DataTable.Content
            headerClassName={LIST_TABLE_HEADER_CLASS}
            headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
            headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
            bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
            rowClassName={LIST_TABLE_ROW_CLASS}
            cellClassName={EMBEDDED_TABLE_CELL_CLASS}
            emptyMessage={t`No linked projects`}
          />
          {skipped > 0 ? (
            <CardMessage className={cn(TABLE_CARD_FOOTER_CLASS, 'px-4')}>
              <Trans>
                Spend shows for the first {MAX_PROJECT_SPEND_REQUESTS} projects. See the usage
                dashboard for the other {skipped}.
              </Trans>
            </CardMessage>
          ) : null}
        </DataTable.Client>
      </CardQueryState>
    </TableCard>
  );
}

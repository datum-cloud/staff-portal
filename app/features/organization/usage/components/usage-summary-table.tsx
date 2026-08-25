import { groupUsageSummaryRows } from '../usage-summary-grouping';
import { formatCurrency, formatUnitRate, formatUsagePair } from '../usage.format';
import type { UsageSummaryRow } from '../usage.types';
import { UsageSparkline } from './usage-sparkline';
import {
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  ListColumnHeader,
} from '@/features/milo';
import { QuotaIndicator } from '@/features/organization/components/quota-ring';
import type { ColumnDef } from '@/utils/table';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { GroupedTable } from '@datum-cloud/datum-ui/grouped-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronDownIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

interface UsageSummaryTableProps {
  rows: UsageSummaryRow[];
  /** Rows shown before the "Show all" expander kicks in. */
  collapsedCount?: number;
}

export function UsageSummaryTable({ rows, collapsedCount = 5 }: UsageSummaryTableProps) {
  const [listExpanded, setListExpanded] = useState(false);

  const grouped = useMemo(() => groupUsageSummaryRows(rows), [rows]);

  const visibleGroups = useMemo(() => {
    if (listExpanded) return grouped;

    let remaining = collapsedCount;
    const result = [];
    for (const group of grouped) {
      if (remaining <= 0) break;
      const items = group.items.slice(0, remaining);
      if (items.length > 0) {
        result.push({ ...group, items });
        remaining -= items.length;
      }
    }
    return result;
  }, [grouped, listExpanded, collapsedCount]);

  const columns = useMemo<ColumnDef<UsageSummaryRow, unknown>[]>(
    () => [
      {
        id: 'product',
        header: ({ column }) => <ListColumnHeader column={column} title="Product" />,
        accessorFn: (row) => row.label,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <QuotaIndicator used={row.original.used} limit={row.original.limit} />
            <div className="min-w-0 flex-1 overflow-hidden">
              <Tooltip message={row.original.label}>
                <span className="block truncate text-sm">{row.original.label}</span>
              </Tooltip>
            </div>
          </div>
        ),
      },
      {
        id: 'trend',
        header: ({ column }) => <ListColumnHeader column={column} title="Trend" />,
        enableSorting: false,
        size: 192,
        cell: ({ row }) => (
          <UsageSparkline
            apiName={row.original.apiName}
            unit={row.original.unit}
            series={row.original.series}
          />
        ),
      },
      {
        id: 'usage',
        header: ({ column }) => <ListColumnHeader column={column} title="Usage" />,
        enableSorting: false,
        size: 144,
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right text-sm whitespace-nowrap tabular-nums">
            {formatUsagePair(row.original.unit, row.original.used, row.original.limit)}
          </span>
        ),
      },
      {
        id: 'rate',
        header: ({ column }) => <ListColumnHeader column={column} title="Rate" />,
        enableSorting: false,
        size: 128,
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right text-sm whitespace-nowrap tabular-nums">
            {formatUnitRate(
              row.original.unitRate,
              row.original.unit,
              row.original.currencyCode,
              row.original.pricingUnit
            )}
          </span>
        ),
      },
      {
        id: 'spend',
        header: ({ column }) => <ListColumnHeader column={column} title="Spend" />,
        enableSorting: false,
        size: 112,
        cell: ({ row }) => (
          <span className="text-foreground block text-right text-sm font-medium whitespace-nowrap tabular-nums">
            {formatCurrency(row.original.spend, row.original.currencyCode)}
          </span>
        ),
      },
    ],
    []
  );

  const groupedTableGroups = useMemo(
    () =>
      visibleGroups.map((group) => ({
        id: group.group,
        title: group.group,
        meta: (
          <Badge
            type="secondary"
            className="text-2xs flex cursor-default items-center gap-1.5 px-1 py-0.5 font-bold">
            {group.items.length}
          </Badge>
        ),
        rows: group.items,
      })),
    [visibleGroups]
  );

  const visibleGroupIds = useMemo(() => visibleGroups.map((group) => group.group), [visibleGroups]);
  const visibleGroupIdsKey = visibleGroupIds.join('|');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(visibleGroupIds);
  const [expandedGroupsKey, setExpandedGroupsKey] = useState(visibleGroupIdsKey);

  // Reset expansion when the visible group set changes (e.g. Show all / Show less).
  // Adjusting state during render avoids an effect → setState cascade.
  if (expandedGroupsKey !== visibleGroupIdsKey) {
    setExpandedGroupsKey(visibleGroupIdsKey);
    setExpandedGroups(visibleGroupIds);
  }

  const canExpand = rows.length > collapsedCount;
  const lastGroupId = visibleGroups[visibleGroups.length - 1]?.group;

  if (rows.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No meters defined yet for this organization.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="min-w-0 overflow-x-auto p-0">
        <GroupedTable<UsageSummaryRow>
          columns={columns}
          groups={groupedTableGroups}
          enableSorting
          expanded={expandedGroups}
          onExpandedChange={setExpandedGroups}
          getRowId={(row) => row.apiName}
          className="usage-summary-grouped-table [&>div:last-child]:rounded-none [&>div:last-child]:border-0"
          tableClassName="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 sm:[&_td:first-child]:pl-5 sm:[&_td:last-child]:pr-5"
          headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
          headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
          bodyClassName={cn(
            '[&_tr:first-child]:border-t [&_tr]:border-border',
            canExpand ? '[&_tr:last-child]:border-b' : '[&_tr:last-child]:border-b-0'
          )}
          groupHeaderClassName={(group) => {
            const isOpen = expandedGroups.includes(group.id);
            const isLastGroup = group.id === lastGroupId;
            const groupIndex = visibleGroups.findIndex((g) => g.group === group.id);
            const previousGroupId = visibleGroups[groupIndex - 1]?.group;
            const previousGroupOpen = previousGroupId
              ? expandedGroups.includes(previousGroupId)
              : true;

            return cn(
              'bg-muted/40 text-foreground h-10 border-r-0 border-border px-4 text-xs font-medium sm:px-5',
              groupIndex > 0 && !previousGroupOpen && 'border-t',
              isOpen ? 'border-b-0' : isLastGroup ? 'border-b' : 'border-b-0'
            );
          }}
        />
      </CardContent>
      {canExpand && (
        <CardFooter className="bg-background flex items-center justify-center p-0">
          <Button
            htmlType="button"
            type="quaternary"
            theme="borderless"
            size="small"
            onClick={() => setListExpanded((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground w-full gap-1.5 rounded-none py-3 text-xs">
            {listExpanded ? 'Show less' : 'Show all'}
            <Icon
              icon={ChevronDownIcon}
              className={cn('size-3.5 transition-transform', listExpanded && 'rotate-180')}
            />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/** Skeleton props shared with the loading dashboard state. */
export const usageSummaryTableColumns: ColumnDef<UsageSummaryRow, unknown>[] = [
  { id: 'product', header: 'Product', size: 256 },
  { id: 'trend', header: 'Trend', size: 192 },
  { id: 'usage', header: 'Usage', size: 144 },
  { id: 'rate', header: 'Rate', size: 128 },
  { id: 'spend', header: 'Spend', size: 112 },
];

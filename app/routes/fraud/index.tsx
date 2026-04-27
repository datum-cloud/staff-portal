import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayId } from '@/components/display';
import { useContactAllListQuery, useSearchUsersQuery } from '@/resources/request/client';
import {
  useCreateFraudEvaluationMutation,
  useDeleteFraudEvaluationMutation,
  useFraudEvaluationListQuery,
  useFraudPolicyListQuery,
} from '@/resources/request/client';
import { fraudRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisFraudV1Alpha1FraudEvaluation } from '@openapi/fraud.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';

type FraudEvaluation = ComMiloapisFraudV1Alpha1FraudEvaluation;

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Fraud Evaluations`);
};

const newEvalSchema = z.object({
  user: z.string().min(1, 'User is required'),
});

const columnHelper = createColumnHelper<FraudEvaluation>();

export default function Page() {
  const tableQuery = useFraudEvaluationListQuery();
  const policyQuery = useFraudPolicyListQuery();
  const [showNewEval, setShowNewEval] = useState(false);
  const [selectedEval, setSelectedEval] = useState<FraudEvaluation | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const createEvaluationMutation = useCreateFraudEvaluationMutation();
  const deleteEvaluationMutation = useDeleteFraudEvaluationMutation();

  const contactsQuery = useContactAllListQuery();

  const contactsByUser = useMemo(() => {
    const map = new Map<string, { email?: string; name?: string }>();
    for (const contact of contactsQuery.data?.items ?? []) {
      const userId = contact.spec?.subject?.name;
      if (!userId) continue;
      const name =
        `${contact.spec?.givenName ?? ''} ${contact.spec?.familyName ?? ''}`.trim() || undefined;
      map.set(userId, { email: contact.spec?.email, name });
    }
    return map;
  }, [contactsQuery.data]);

  // Keep a ref so the searchFn closure always reads the latest contacts
  const contactsByUserRef = useRef(contactsByUser);
  useEffect(() => {
    contactsByUserRef.current = contactsByUser;
  }, [contactsByUser]);

  const { data: searchResults, isLoading: usersLoading } = useSearchUsersQuery(userSearchQuery, 2);

  const userOptions = useMemo(() => {
    if (!searchResults) return [];
    return searchResults.map((user) => {
      const userId = user.metadata?.name ?? '';
      const contact = contactsByUser.get(userId);
      const label =
        `${user.spec?.givenName ?? ''} ${user.spec?.familyName ?? ''}`.trim() ||
        contact?.name ||
        userId;
      const description = user.spec?.email ?? contact?.email ?? userId;
      return { value: userId, label, description };
    });
  }, [searchResults, contactsByUser]);

  const setUserSearch = useCallback((query: string) => {
    setUserSearchQuery(query);
  }, []);

  const policyLoaded = !policyQuery.isLoading;
  const policyName = policyQuery.data?.items?.[0]?.metadata?.name;

  const actions: ActionItem<FraudEvaluation>[] = [
    {
      label: t`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedEval(row),
    },
  ];

  const columns = [
    columnHelper.accessor('spec.userRef.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`User`} />,
      cell: ({ row }) => {
        const name = row.original.metadata?.name ?? '';
        return (
          <Link to={fraudRoutes.evaluations.detail(name)} className="text-primary hover:underline">
            <DisplayId value={row.original.spec?.userRef?.name ?? ''} />
          </Link>
        );
      },
    }),
    columnHelper.display({
      id: 'email',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Email`} />,
      cell: ({ row }) => {
        const userId = row.original.spec?.userRef?.name;
        const email = userId ? contactsByUser.get(userId)?.email : undefined;
        if (!email)
          return (
            <Text size="sm" textColor="muted">
              -
            </Text>
          );
        return <Text size="sm">{email}</Text>;
      },
    }),
    columnHelper.accessor('status.phase', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Pending'} />,
    }),
    columnHelper.accessor('status.compositeScore', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Score`} />,
      cell: ({ getValue, row }) => {
        const score = getValue();
        if (!score)
          return (
            <Text size="sm" textColor="muted">
              -
            </Text>
          );
        const decision = row.original.status?.decision;
        const color =
          decision === 'DEACTIVATE'
            ? 'text-red-600 dark:text-red-400'
            : decision === 'REVIEW'
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-green-600 dark:text-green-400';
        return <Text className={`font-mono text-sm font-medium ${color}`}>{score}</Text>;
      },
    }),
    columnHelper.accessor('status.decision', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Decision`} />,
      cell: ({ getValue }) => {
        const decision = getValue();
        if (!decision || decision === 'ACCEPTED')
          return (
            <Text size="sm" textColor="muted">
              Accepted
            </Text>
          );
        return (
          <BadgeState state={decision === 'DEACTIVATE' ? 'error' : 'warning'} message={decision} />
        );
      },
    }),
    columnHelper.accessor('status.enforcementAction', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Enforcement`} />,
      cell: ({ getValue }) => {
        const action = getValue();
        if (!action)
          return (
            <Text size="sm" textColor="muted">
              None
            </Text>
          );
        return <BadgeState state={action === 'OBSERVED' ? 'info' : 'active'} message={action} />;
      },
    }),
    columnHelper.accessor('status.lastEvaluationTime', {
      id: 'lastEvaluationTime',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Evaluated`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right" />,
      cell: ({ row }) => (
        <div className="flex w-full justify-end">
          <DataTable.RowActions row={row} actions={actions} />
        </div>
      ),
    }),
  ];

  return (
    <>
      <AppActionBar>
        <Button
          type="primary"
          icon={<PlusCircleIcon size={16} />}
          disabled={policyLoaded && !policyName}
          onClick={() => setShowNewEval(true)}>
          <Trans>New Evaluation</Trans>
        </Button>
      </AppActionBar>

      <DialogForm
        open={showNewEval}
        onOpenChange={setShowNewEval}
        title={t`New Fraud Evaluation`}
        description={t`Select a user to run a fraud evaluation against the current policy.`}
        submitText={t`Run Evaluation`}
        cancelText={t`Cancel`}
        schema={newEvalSchema}
        defaultValues={{ user: '' }}
        onSubmit={async (data) => {
          await createEvaluationMutation.mutateAsync({
            apiVersion: 'fraud.miloapis.com/v1alpha1',
            kind: 'FraudEvaluation',
            metadata: {
              generateName: 'eval-',
            },
            spec: {
              userRef: { name: data.user },
              policyRef: { name: policyName ?? '' },
            },
          });
          toast.success(t`Fraud evaluation started`);
        }}>
        <Form.Field name="user">
          <Form.Autosearch
            modal
            options={userOptions}
            onSearch={setUserSearch}
            loading={usersLoading}
            placeholder={t`Search by name or email...`}
            searchDebounceMs={500}
          />
        </Form.Field>
      </DialogForm>

      <DialogConfirm
        open={!!selectedEval}
        onOpenChange={() => setSelectedEval(null)}
        title={t`Delete Evaluation`}
        description={t`Are you sure you want to delete this fraud evaluation? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await deleteEvaluationMutation.mutateAsync(selectedEval?.metadata?.name ?? '');
          setSelectedEval(null);
          toast.success(t`Evaluation deleted successfully`);
        }}
      />

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        filterFns={{
          'status.enforcementAction': (cellValue, filterValue) =>
            String(cellValue ?? '').toUpperCase() === String(filterValue ?? '').toUpperCase(),
        }}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'lastEvaluationTime', desc: true }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          const userId = (row.spec?.userRef?.name ?? '').toLowerCase();
          const name = (row.metadata?.name ?? '').toLowerCase();
          const decision = (row.status?.decision ?? '').toLowerCase();
          const contact = userId
            ? contactsByUserRef.current.get(row.spec?.userRef?.name ?? '')
            : undefined;
          const email = (contact?.email ?? '').toLowerCase();
          const contactName = (contact?.name ?? '').toLowerCase();
          return (
            userId.includes(q) ||
            name.includes(q) ||
            decision.includes(q) ||
            email.includes(q) ||
            contactName.includes(q)
          );
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search
                  placeholder={t`Search by email, name, or ID...`}
                  className="w-full md:w-64"
                />
              }
              filters={
                <>
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
                      { value: 'ACCEPTED', label: t`Accepted` },
                      { value: 'REVIEW', label: t`Review` },
                      { value: 'DEACTIVATE', label: t`Deactivate` },
                    ]}
                  />
                  <DataTable.SelectFilter
                    column="status.enforcementAction"
                    label={t`Enforcement`}
                    placeholder={t`Filter by enforcement`}
                    options={[
                      { value: 'OBSERVED', label: t`Observed` },
                      { value: 'ENFORCED', label: t`Enforced` },
                    ]}
                  />
                </>
              }
            />

            <DataTable.ActiveFilters
              excludeFilters={['search']}
              filterLabels={{
                'status.phase': t`Phase`,
                'status.decision': t`Decision`,
                'status.enforcementAction': t`Enforcement`,
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
    </>
  );
}

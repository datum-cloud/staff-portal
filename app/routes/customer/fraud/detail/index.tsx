import type { Route } from './+types/index';
import {
  EvaluationBackLink,
  EvaluationHistorySection,
  EvaluationOverview,
  StageResultsSection,
  UserEvaluationsTable,
} from '@/features/fraud';
import { SectionCard } from '@/features/milo';
import { useContactBySubjectUserQuery, useUserDetailQuery } from '@/resources/request/client';
import {
  useFraudEvaluationDetailQuery,
  useFraudEvaluationListQuery,
} from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useParams } from 'react-router';

function EvaluationBreadcrumb() {
  const { evalName } = useParams<{ evalName: string }>();
  return <span>{evalName ?? ''}</span>;
}

export const handle = {
  // The breadcrumb is called with `match.data`, not params. Use a small
  // component so we can read the param via the router.
  breadcrumb: () => <EvaluationBreadcrumb />,
};

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Fraud Evaluation Detail`);
};

export default function Page() {
  const { evalName } = useParams();
  const evalQuery = useFraudEvaluationDetailQuery(evalName ?? '');
  const evaluation = evalQuery.data;

  const userId = evaluation?.spec?.userRef?.name;

  const userQuery = useUserDetailQuery(userId ?? '');

  const contactQuery = useContactBySubjectUserQuery(userId ?? '');

  const userEmail = userQuery.data?.spec?.email;
  const contact = contactQuery.data?.items?.[0];
  const contactName =
    `${contact?.spec?.givenName ?? ''} ${contact?.spec?.familyName ?? ''}`.trim() || null;

  // Fetch all evaluations to filter by the same user
  const allEvalsQuery = useFraudEvaluationListQuery();
  const userEvaluations = (allEvalsQuery.data?.items ?? [])
    .filter((e) => e.spec?.userRef?.name === evaluation?.spec?.userRef?.name)
    .sort(
      (a, b) =>
        new Date(b.status?.lastEvaluationTime ?? 0).getTime() -
        new Date(a.status?.lastEvaluationTime ?? 0).getTime()
    );

  if (evalQuery.isLoading) {
    return (
      <SectionCard className="m-4" contentClassName="flex items-center justify-center py-12">
        <Text size="sm" textColor="muted">
          <Trans>Loading evaluation...</Trans>
        </Text>
      </SectionCard>
    );
  }

  if (!evaluation) {
    return (
      <SectionCard className="m-4" contentClassName="flex items-center justify-center py-12">
        <Text size="sm" textColor="muted">
          <Trans>Evaluation not found.</Trans>
        </Text>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <EvaluationBackLink />
      <EvaluationOverview evaluation={evaluation} contactName={contactName} userEmail={userEmail} />
      <StageResultsSection stageResults={evaluation.status?.stageResults ?? []} />
      <EvaluationHistorySection entries={evaluation.status?.history ?? []} />
      <UserEvaluationsTable evaluations={userEvaluations} currentName={evalName ?? ''} />
    </div>
  );
}

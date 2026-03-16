import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { useFraudEvaluationDetailQuery } from '@/resources/request/client';
import type { HistoryEntry, ProviderResult, StageResult } from '@/resources/types/fraud.types';
import { fraudRoutes, userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ArrowLeft, Clock, History, Layers, User } from 'lucide-react';
import { Link, useParams } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Fraud Evaluation Detail`);
};

function ScoreDisplay({ score }: { score?: string }) {
  if (!score) return <span className="text-muted-foreground">-</span>;
  const numScore = parseFloat(score);
  const color =
    numScore >= 70
      ? 'text-red-600 dark:text-red-400'
      : numScore >= 30
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-green-600 dark:text-green-400';
  return <span className={`font-mono text-2xl font-bold ${color}`}>{score}</span>;
}

function ProviderResultRow({ result }: { result: ProviderResult }) {
  return (
    <div className="border-border flex items-center justify-between border-b py-2 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{result.provider}</span>
        {result.failurePolicyApplied && (
          <BadgeState state="warning" message={result.failurePolicyApplied} />
        )}
        {result.error && <BadgeState state="error" message="Error" tooltip={result.error} />}
      </div>
      <div className="flex items-center gap-4">
        {result.duration && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {result.duration}
          </span>
        )}
        <span className="font-mono text-sm font-medium">{result.score}</span>
      </div>
    </div>
  );
}

function StageResultCard({ result, index }: { result: StageResult; index: number }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="bg-muted flex h-5 w-5 items-center justify-center rounded-full text-xs">
              {index + 1}
            </span>
            {result.name}
          </div>
          {result.skipped && <BadgeState state="pending" message="Skipped" />}
        </CardTitle>
      </CardHeader>
      {!result.skipped && result.providerResults && (
        <CardContent className="pt-0">
          {result.providerResults.map((pr, i) => (
            <ProviderResultRow key={i} result={pr} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return null;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          <Trans>Evaluation History</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-border divide-y">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <DateTime date={entry.timestamp} />
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{entry.compositeScore}</span>
                <BadgeState
                  state={
                    entry.decision === 'DEACTIVATE'
                      ? 'error'
                      : entry.decision === 'REVIEW'
                        ? 'warning'
                        : 'active'
                  }
                  message={entry.decision}
                />
                {entry.trigger && (
                  <span className="text-muted-foreground text-xs">{entry.trigger}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const { evalName } = useParams();
  const evalQuery = useFraudEvaluationDetailQuery(evalName ?? '');
  const evaluation = evalQuery.data;

  if (evalQuery.isLoading) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <span className="text-muted-foreground text-sm">
            <Trans>Loading evaluation...</Trans>
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!evaluation) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <span className="text-muted-foreground text-sm">
            <Trans>Evaluation not found.</Trans>
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        to={fraudRoutes.list()}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-3 w-3" />
        <Trans>Back to evaluations</Trans>
      </Link>

      {/* Overview */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            <Trans>Evaluation Overview</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>User</Trans>
              </h4>
              <Link
                to={userRoutes.detail(evaluation.spec.userRef.name)}
                className="text-primary hover:underline">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <DisplayId value={evaluation.spec.userRef.name} />
                </div>
              </Link>
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Score</Trans>
              </h4>
              <ScoreDisplay score={evaluation.status?.compositeScore} />
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Phase</Trans>
              </h4>
              <BadgeState state={evaluation.status?.phase ?? 'Pending'} />
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Decision</Trans>
              </h4>
              {evaluation.status?.decision && evaluation.status.decision !== 'NONE' ? (
                <BadgeState
                  state={evaluation.status.decision === 'DEACTIVATE' ? 'error' : 'warning'}
                  message={evaluation.status.decision}
                />
              ) : (
                <span className="text-muted-foreground text-sm">None</span>
              )}
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Enforcement</Trans>
              </h4>
              {evaluation.status?.enforcementAction &&
              evaluation.status.enforcementAction !== 'NONE' ? (
                <BadgeState
                  state={
                    evaluation.status.enforcementAction === 'DEACTIVATED'
                      ? 'error'
                      : evaluation.status.enforcementAction === 'OBSERVED'
                        ? 'info'
                        : 'warning'
                  }
                  message={evaluation.status.enforcementAction}
                />
              ) : (
                <span className="text-muted-foreground text-sm">None</span>
              )}
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Evaluated</Trans>
              </h4>
              <DateTime date={evaluation.status?.lastEvaluationTime} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Results */}
      {evaluation.status?.stageResults && evaluation.status.stageResults.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4" />
            <Trans>Stage Results</Trans>
          </h3>
          <div className="space-y-3">
            {evaluation.status.stageResults.map((sr, i) => (
              <StageResultCard key={sr.name} result={sr} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {evaluation.status?.history && <HistoryTable entries={evaluation.status.history} />}
    </div>
  );
}

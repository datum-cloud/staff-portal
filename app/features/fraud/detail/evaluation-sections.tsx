import type { FraudEvaluation, HistoryEntry, ProviderResult, StageResult } from './types';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { fraudRoutes, userRoutes } from '@/utils/config/routes.config';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ArrowLeft, Clock, History, Layers, Mail, User } from 'lucide-react';
import { Link } from 'react-router';

function ScoreDisplay({ score }: { score?: string }) {
  if (!score) return <Text textColor="muted">-</Text>;
  const numScore = parseFloat(score);
  const color =
    numScore >= 70
      ? 'text-red-600 dark:text-red-400'
      : numScore >= 30
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-green-600 dark:text-green-400';
  return (
    <Text className={`font-mono text-2xl font-bold ${color}`} as="span">
      {score}
    </Text>
  );
}

function ProviderResultRow({ result }: { result: ProviderResult }) {
  return (
    <div className="border-border flex items-center justify-between border-b py-2 last:border-0">
      <div className="flex items-center gap-3">
        <Text size="sm" weight="medium">
          {result.provider}
        </Text>
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
        <Text className="font-mono text-sm font-medium">{result.score}</Text>
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
                <Text className="font-mono text-sm">{entry.compositeScore}</Text>
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
                  <Text size="xs" textColor="muted">
                    {entry.trigger}
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function UserEvaluationsTable({
  evaluations,
  currentName,
}: {
  evaluations: FraudEvaluation[];
  currentName: string;
}) {
  if (evaluations.length <= 1) return null;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          <Trans>All Evaluations for this User</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-border divide-y">
          {evaluations.map((evaluation) => {
            const isCurrent = evaluation.metadata?.name === currentName;
            return (
              <div
                key={evaluation.metadata?.name}
                className={`flex items-center justify-between py-2 ${isCurrent ? 'bg-muted/50 -mx-2 rounded px-2' : ''}`}>
                <div className="flex items-center gap-2">
                  {isCurrent ? (
                    <Text size="sm" weight="medium">
                      {evaluation.metadata?.name}{' '}
                      <Text as="span" size="xs" textColor="muted">
                        (current)
                      </Text>
                    </Text>
                  ) : (
                    <Link
                      to={fraudRoutes.evaluationDetail(evaluation.metadata?.name ?? '')}
                      className="text-primary text-sm font-medium hover:underline">
                      {evaluation.metadata?.name}
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <BadgeState state={evaluation.status?.phase ?? 'Pending'} />
                  {evaluation.status?.compositeScore && (
                    <Text className="font-mono text-sm">{evaluation.status.compositeScore}</Text>
                  )}
                  {evaluation.status?.decision && evaluation.status.decision !== 'ACCEPTED' && (
                    <BadgeState
                      state={evaluation.status.decision === 'DEACTIVATE' ? 'error' : 'warning'}
                      message={evaluation.status.decision}
                    />
                  )}
                  <DateTime date={evaluation.status?.lastEvaluationTime} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function EvaluationBackLink() {
  return (
    <Link
      to={fraudRoutes.list()}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
      <ArrowLeft className="h-3 w-3" />
      <Trans>Back to evaluations</Trans>
    </Link>
  );
}

export function EvaluationOverview({
  evaluation,
  contactName,
  userEmail,
}: {
  evaluation: FraudEvaluation;
  contactName: string | null;
  userEmail?: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">
          <Trans>Evaluation Overview</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Row gutter={[24, 24]}>
          <Col span={12} sm={8} lg={4}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>User</Trans>
            </Text>
            <Link
              to={userRoutes.detail(evaluation.spec.userRef.name)}
              className="text-primary hover:underline">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <DisplayId value={evaluation.spec.userRef.name} />
              </div>
            </Link>
          </Col>
          {(contactName || userEmail) && (
            <Col span={12} sm={8} lg={4}>
              <Text
                size="xs"
                textColor="muted"
                className="mb-1 font-medium tracking-wide uppercase">
                <Trans>Contact</Trans>
              </Text>
              <div className="space-y-0.5">
                {contactName && (
                  <Text size="sm" weight="medium">
                    {contactName}
                  </Text>
                )}
                {userEmail && (
                  <Text size="sm" textColor="muted" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {userEmail}
                  </Text>
                )}
              </div>
            </Col>
          )}
          <Col span={12} sm={8} lg={4}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>Score</Trans>
            </Text>
            <ScoreDisplay score={evaluation.status?.compositeScore} />
          </Col>
          <Col span={12} sm={8} lg={4}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>Phase</Trans>
            </Text>
            <BadgeState state={evaluation.status?.phase ?? 'Pending'} />
          </Col>
          <Col span={12} sm={8} lg={4}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>Decision</Trans>
            </Text>
            {evaluation.status?.decision && evaluation.status.decision !== 'ACCEPTED' ? (
              <BadgeState
                state={evaluation.status.decision === 'DEACTIVATE' ? 'error' : 'warning'}
                message={evaluation.status.decision}
              />
            ) : (
              <Text size="sm" textColor="muted">
                None
              </Text>
            )}
          </Col>
          <Col span={12} sm={8} lg={4}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>Enforcement</Trans>
            </Text>
            {evaluation.status?.enforcementAction ? (
              <BadgeState
                state={evaluation.status.enforcementAction === 'OBSERVED' ? 'info' : 'active'}
                message={evaluation.status.enforcementAction}
              />
            ) : (
              <Text size="sm" textColor="muted">
                None
              </Text>
            )}
          </Col>
          <Col span={12} sm={8} lg={4}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>Evaluated</Trans>
            </Text>
            <DateTime date={evaluation.status?.lastEvaluationTime} />
          </Col>
        </Row>
      </CardContent>
    </Card>
  );
}

export function StageResultsSection({ stageResults }: { stageResults: StageResult[] }) {
  if (!stageResults.length) return null;

  return (
    <div>
      <Title level={6} className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4" />
        <Trans>Stage Results</Trans>
      </Title>
      <div className="space-y-3">
        {stageResults.map((sr, i) => (
          <StageResultCard key={sr.name} result={sr} index={i} />
        ))}
      </div>
    </div>
  );
}

export function EvaluationHistorySection({ entries }: { entries: HistoryEntry[] }) {
  return <HistoryTable entries={entries} />;
}

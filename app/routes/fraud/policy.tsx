import type { Route } from './+types/policy';
import { BadgeState } from '@/components/badge';
import { useFraudPolicyListQuery } from '@/resources/request/client';
import type { FraudPolicy, Stage } from '@/resources/types/fraud.types';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { AlertTriangle, ArrowRightLeft, Eye, Layers, Shield, Zap } from 'lucide-react';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Fraud Policy`);
};

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
              {index + 1}
            </span>
            {stage.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {stage.required && <BadgeState state="info" message="Required" />}
            {stage.shortCircuit && (
              <BadgeState
                state="pending"
                message={`Short-circuit < ${stage.shortCircuit.skipWhenBelow}`}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            <Trans>Providers</Trans>
          </h4>
          <div className="flex flex-wrap gap-2">
            {stage.providers.map((p) => (
              <BadgeState key={p.providerRef.name} state="info" message={p.providerRef.name} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            <Trans>Thresholds</Trans>
          </h4>
          <div className="flex flex-wrap gap-2">
            {stage.thresholds
              .sort((a, b) => a.minScore - b.minScore)
              .map((th) => (
                <BadgeState
                  key={`${th.minScore}-${th.action}`}
                  state={th.action === 'DEACTIVATE' ? 'error' : 'warning'}
                  message={`>= ${th.minScore} → ${th.action}`}
                />
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyDetail({ policy }: { policy: FraudPolicy }) {
  const conditions = policy.status?.conditions ?? [];
  const available = conditions.find((c) => c.type === 'Available');
  const degraded = conditions.find((c) => c.type === 'Degraded');

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {policy.metadata?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Enforcement Mode</Trans>
              </h4>
              <div className="flex items-center gap-2">
                {policy.spec.enforcement.mode === 'OBSERVE' ? (
                  <Eye className="text-muted-foreground h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4 text-yellow-500" />
                )}
                <BadgeState
                  state={policy.spec.enforcement.mode === 'OBSERVE' ? 'info' : 'warning'}
                  message={policy.spec.enforcement.mode}
                />
              </div>
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Stages</Trans>
              </h4>
              <div className="flex items-center gap-2">
                <Layers className="text-muted-foreground h-4 w-4" />
                <span className="text-sm font-medium">{policy.spec.stages.length}</span>
              </div>
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>History Retention</Trans>
              </h4>
              <span className="text-sm font-medium">
                {policy.spec.historyRetention?.maxEntries ?? 50} entries
              </span>
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Status</Trans>
              </h4>
              <div className="flex items-center gap-2">
                {available && (
                  <BadgeState
                    state={available.status === 'True' ? 'active' : 'error'}
                    message={available.status === 'True' ? 'Available' : 'Unavailable'}
                  />
                )}
                {degraded?.status === 'True' && <BadgeState state="warning" message="Degraded" />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ArrowRightLeft className="h-4 w-4" />
          <Trans>Evaluation Pipeline</Trans>
        </h3>
        <div className="space-y-3">
          {policy.spec.stages.map((stage, i) => (
            <StageCard key={stage.name} stage={stage} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const policyQuery = useFraudPolicyListQuery();
  const policies = policyQuery.data?.items ?? [];
  const policy = policies[0]; // Singleton

  if (policyQuery.isLoading) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <span className="text-muted-foreground text-sm">
            <Trans>Loading policy...</Trans>
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!policy) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertTriangle className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            <Trans>No fraud policy configured.</Trans>
          </p>
        </CardContent>
      </Card>
    );
  }

  return <PolicyDetail policy={policy} />;
}

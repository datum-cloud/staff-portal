import type { FraudPolicy, Stage } from './types';
import { BadgeState } from '@/components/badge';
import { SectionCard } from '@/features/milo';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { startCase } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Layers, Shield, Zap } from 'lucide-react';

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2 text-base">
          <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
            {index + 1}
          </span>
          {stage.name}
        </span>
      }
      action={
        <div className="flex items-center gap-2">
          {stage.required && <BadgeState state="info" message={t`Required`} />}
          {stage.shortCircuit && (
            <BadgeState
              state="pending"
              message={t`Short-circuit < ${stage.shortCircuit.skipWhenBelow}`}
            />
          )}
        </div>
      }
      contentClassName="space-y-3">
      <div>
        <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
          <Trans>Providers</Trans>
        </Text>
        <div className="flex flex-wrap gap-2">
          {stage.providers.map((p) => (
            <BadgeState key={p.providerRef.name} state="info" message={p.providerRef.name} />
          ))}
        </div>
      </div>
      <div>
        <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
          <Trans>Thresholds</Trans>
        </Text>
        <div className="flex flex-wrap gap-2">
          {stage.thresholds
            .sort((a, b) => a.minScore - b.minScore)
            .map((th) => (
              <BadgeState
                key={`${th.minScore}-${th.action}`}
                state={th.action === 'DEACTIVATE' ? 'error' : 'warning'}
                message={`>= ${th.minScore} -> ${th.action}`}
              />
            ))}
        </div>
      </div>
    </SectionCard>
  );
}

export function PolicyDetail({
  policy,
  onEdit,
  onDelete,
}: {
  policy: FraudPolicy;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const conditions = policy.status?.conditions ?? [];
  const available = conditions.find((c) => c.type === 'Available');
  const degraded = conditions.find((c) => c.type === 'Degraded');

  return (
    <div className="m-4 space-y-6">
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {policy.metadata?.name}
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              type="tertiary"
              theme="outline"
              icon={<ACTION_ICONS.edit size={16} />}
              onClick={onEdit}>
              <Trans>Edit</Trans>
            </Button>
            <Button
              type="danger"
              theme="outline"
              icon={<ACTION_ICONS.delete size={16} />}
              onClick={onDelete}>
              <Trans>Delete</Trans>
            </Button>
          </div>
        }>
        <Row gutter={[16, 16]}>
          <Col span={12} sm={6}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>Enforcement Mode</Trans>
            </Text>
            <div className="flex items-center gap-2">
              {policy.spec.enforcement.mode === 'OBSERVE' ? (
                <ACTION_ICONS.view className="text-muted-foreground h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4 text-yellow-500" />
              )}
              <BadgeState
                state={policy.spec.enforcement.mode === 'OBSERVE' ? 'info' : 'warning'}
                message={startCase(policy.spec.enforcement.mode)}
              />
            </div>
          </Col>
          <Col span={12} sm={6}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>Stages</Trans>
            </Text>
            <div className="flex items-center gap-2">
              <Layers className="text-muted-foreground h-4 w-4" />
              <Text size="sm" weight="medium">
                {policy.spec.stages.length}
              </Text>
            </div>
          </Col>
          <Col span={12} sm={6}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>History Retention</Trans>
            </Text>
            <div className="flex items-center gap-2">
              <Text size="sm" weight="medium">
                {t`${policy.spec.historyRetention?.maxEntries ?? 50} entries`}
              </Text>
            </div>
          </Col>
          <Col span={12} sm={6}>
            <Text size="xs" textColor="muted" className="mb-1 font-medium tracking-wide uppercase">
              <Trans>Status</Trans>
            </Text>
            <div className="flex items-center gap-2">
              {available && (
                <BadgeState
                  state={available.status === 'True' ? 'active' : 'error'}
                  message={available.status === 'True' ? t`Available` : t`Unavailable`}
                />
              )}
              {degraded?.status === 'True' && <BadgeState state="warning" message={t`Degraded`} />}
            </div>
          </Col>
        </Row>
      </SectionCard>

      {policy.spec.triggers && policy.spec.triggers.length > 0 && (
        <SectionCard
          title={
            <span className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              <Trans>Triggers</Trans>
            </span>
          }>
          <div className="flex flex-wrap gap-2">
            {policy.spec.triggers.map((trigger, i) => (
              <BadgeState
                key={i}
                state="info"
                message={trigger.type === 'Event' ? (trigger.event ?? trigger.type) : trigger.type}
              />
            ))}
          </div>
        </SectionCard>
      )}

      <div>
        <Title level={6} className="mb-3 flex items-center gap-2">
          <ACTION_ICONS.transfer className="h-4 w-4" />
          <Trans>Evaluation Pipeline</Trans>
        </Title>
        <div className="space-y-3">
          {policy.spec.stages.map((stage, i) => (
            <StageCard key={stage.name} stage={stage} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

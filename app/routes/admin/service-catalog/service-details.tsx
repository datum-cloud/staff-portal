/**
 * A service's own catalog facts: identity, active configuration, pricing,
 * monitored resources, meters, quota and conditions. The Overview route
 * shows it, unless a plugin replaces Overview with its own page (the
 * `path: ""` convention on `PageServiceExtension`); then it moves to the
 * "Service details" route instead, so it's never lost.
 */
import { useServiceDetailData } from './shared';
import { BadgeState } from '@/components/badge';
import { MessageCard } from '@/components/message-card';
import { PageHeader } from '@/components/page-header';
import { getServicePricingsForService } from '@/features/billing/utils';
import {
  ActiveConfigurationSummary,
  ConditionsCard,
  DetailsCard,
  MetersCard,
  MonitoredResourcesCard,
  QuotaLimitsCard,
  ServicePricingsCard,
} from '@/features/service-catalog';
import {
  useServiceConfigurationsByServiceQuery,
  useServicePricingListQuery,
  type ServiceConfiguration,
} from '@/resources/request/client';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';
import { Link } from 'react-router';

function pickActiveConfiguration(
  configs: ServiceConfiguration[]
): ServiceConfiguration | undefined {
  const published = configs.filter((c) => c.spec?.phase === 'Published');
  if (published.length === 0) return undefined;
  return published.slice().sort((a, b) => {
    const at = a.status?.publishedAt ?? a.metadata?.creationTimestamp ?? '';
    const bt = b.status?.publishedAt ?? b.metadata?.creationTimestamp ?? '';
    return bt.localeCompare(at);
  })[0];
}

export function ServiceDetails() {
  const service = useServiceDetailData();
  const serviceName = service.metadata?.name ?? '';

  const {
    data: configList,
    isLoading,
    error,
    refetch,
  } = useServiceConfigurationsByServiceQuery(serviceName);

  const filtered = useMemo(() => {
    return (configList?.items ?? []).filter((c) => c.spec?.serviceRef?.name === serviceName);
  }, [configList, serviceName]);

  const active = useMemo(() => pickActiveConfiguration(filtered), [filtered]);

  const pricingsQuery = useServicePricingListQuery();
  const pricings = useMemo(
    () => getServicePricingsForService(pricingsQuery.data?.items ?? [], service),
    [pricingsQuery.data, service]
  );

  if (error) {
    const is403 =
      error instanceof Error &&
      (error.message.includes('403') || error.message.includes('Forbidden'));
    return (
      <MessageCard
        message={
          is403 ? (
            <Trans>You do not have permission to view service configurations.</Trans>
          ) : (
            <Trans>Failed to load service configurations.</Trans>
          )
        }
        detail={!is403 && (error instanceof Error ? error.message : String(error))}
        actions={
          !is403 && (
            <button onClick={() => refetch()} className="text-primary text-sm hover:underline">
              <Trans>Retry</Trans>
            </button>
          )
        }
      />
    );
  }

  const spec = service.spec;
  const displayName = spec?.displayName ?? serviceName;
  const canonicalName = spec?.serviceName ?? serviceName;
  const phase = spec?.phase ?? '';
  const ownerProject = spec?.owner?.producerProjectRef?.name;
  const description = spec?.description;
  const dependencies = spec?.dependencies ?? [];
  const isGated = spec?.enablementPolicy?.mode === 'GatedByProvider';
  const metrics = active?.spec?.metrics ?? [];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <span>{displayName}</span>
              {phase && <BadgeState state={phase} />}
              {isGated && <BadgeState state="warning" message={t`Gated by Provider`} />}
            </div>
          }
          description={
            description ? (
              <Text size="sm" textColor="muted" className="max-w-2xl">
                {description}
              </Text>
            ) : undefined
          }
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Text size="xs" textColor="muted" className="font-mono">
            {canonicalName}
          </Text>
          {ownerProject && (
            <Text size="xs" textColor="muted">
              <Trans>Owner:</Trans> <span className="font-mono">{ownerProject}</span>
            </Text>
          )}
        </div>

        {dependencies.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Text size="sm" textColor="muted">
              <Trans>Dependencies:</Trans>
            </Text>
            {dependencies.map((dep) => (
              <Link
                key={dep.serviceRef.name}
                to={serviceCatalogRoutes.detail(dep.serviceRef.name)}
                className="text-primary font-mono text-sm hover:underline">
                {dep.serviceRef.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <ActiveConfigurationSummary
        active={active}
        configCount={filtered.length}
        isLoading={isLoading}
      />

      <ServicePricingsCard
        pricings={pricings}
        isLoading={pricingsQuery.isLoading}
        errorMessage={
          pricingsQuery.error
            ? pricingsQuery.error instanceof Error
              ? pricingsQuery.error.message
              : String(pricingsQuery.error)
            : undefined
        }
      />

      <Row type="flex" gutter={[16, 16]}>
        <Col span={24} md={12}>
          <MonitoredResourcesCard
            resources={active?.spec?.monitoredResourceTypes ?? []}
            isLoading={isLoading}
          />
        </Col>
        <Col span={24} md={12}>
          <MetersCard metrics={metrics} isLoading={isLoading} />
        </Col>
        <Col span={24} md={12}>
          <DetailsCard service={service} />
        </Col>
        <Col span={24} md={12}>
          <QuotaLimitsCard limits={active?.spec?.quota?.limits ?? []} isLoading={isLoading} />
        </Col>
      </Row>

      <ConditionsCard
        conditions={active?.status?.conditions ?? []}
        hasActiveConfiguration={!!active}
        isLoading={isLoading}
      />
    </div>
  );
}

import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { useServiceListQuery } from '@/resources/request/client';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Input } from '@datum-cloud/datum-ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';
import { Package } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

type Service = ComMiloapisServicesV1Alpha1Service;

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Service Catalog`);
};

const PHASE_ANY = '__any__';
const ENABLEMENT_ANY = '__any__';

function ServiceCard({ service }: { service: Service }) {
  const name = service.metadata?.name ?? '';
  const displayName = service.spec?.displayName ?? name;
  const phase = service.spec?.phase ?? '';
  const description = service.spec?.description;
  const owner = service.spec?.owner?.producerProjectRef?.name;
  const isGated = service.spec?.enablementPolicy?.mode === 'GatedByProvider';
  const dependencyCount = service.spec?.dependencies?.length ?? 0;

  return (
    <Link
      to={serviceCatalogRoutes.detail(name)}
      className="hover:border-primary/40 group bg-card block rounded-lg border transition-colors">
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="bg-muted/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border">
            <Package className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Text size="base" className="group-hover:text-primary truncate font-medium">
              {displayName}
            </Text>
            {owner && (
              <Text size="xs" textColor="muted" className="truncate">
                <Trans>by</Trans> <span className="font-mono">{owner}</span>
              </Text>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {isGated && <BadgeState state="warning" message={t`Private Beta`} />}
            {phase && <BadgeState state={phase} />}
          </div>
        </div>

        {description ? (
          <Text size="sm" textColor="muted" className="line-clamp-3">
            {description}
          </Text>
        ) : (
          <Text size="sm" textColor="muted" className="italic">
            <Trans>No description</Trans>
          </Text>
        )}

        {dependencyCount > 0 && (
          <Text size="xs" textColor="muted" className="mt-auto pt-1">
            <Trans>{dependencyCount} dependencies</Trans>
          </Text>
        )}
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="animate-pulse space-y-3">
        <div className="bg-muted h-5 w-3/4 rounded" />
        <div className="bg-muted h-3 w-1/2 rounded" />
        <div className="bg-muted h-3 w-full rounded" />
        <div className="bg-muted h-3 w-5/6 rounded" />
        <div className="bg-muted h-5 w-24 rounded" />
      </div>
    </div>
  );
}

export default function ServiceCatalogPage() {
  const { data, isLoading, error, refetch } = useServiceListQuery();

  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>(PHASE_ANY);
  const [enablementFilter, setEnablementFilter] = useState<string>(ENABLEMENT_ANY);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter((s) => {
      if (phaseFilter !== PHASE_ANY && (s.spec?.phase ?? '') !== phaseFilter) return false;
      if (
        enablementFilter !== ENABLEMENT_ANY &&
        (s.spec?.enablementPolicy?.mode ?? 'SelfService') !== enablementFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        s.metadata?.name,
        s.spec?.displayName,
        s.spec?.description,
        s.spec?.owner?.producerProjectRef?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search, phaseFilter, enablementFilter]);

  if (error) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Text size="sm" textColor="muted">
            <Trans>Failed to load service catalog.</Trans>
          </Text>
          <Text size="sm" textColor="muted" className="font-mono text-xs">
            {error instanceof Error ? error.message : String(error)}
          </Text>
          <button onClick={() => refetch()} className="text-primary text-sm hover:underline">
            <Trans>Retry</Trans>
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t`Search by name, description, or owner...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-72"
        />
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t`Phase`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PHASE_ANY}>{t`Any phase`}</SelectItem>
            <SelectItem value="Draft">{t`Draft`}</SelectItem>
            <SelectItem value="Published">{t`Published`}</SelectItem>
            <SelectItem value="Deprecated">{t`Deprecated`}</SelectItem>
            <SelectItem value="Retired">{t`Retired`}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={enablementFilter} onValueChange={setEnablementFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t`Enablement`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ENABLEMENT_ANY}>{t`Any enablement`}</SelectItem>
            <SelectItem value="SelfService">{t`Self Service`}</SelectItem>
            <SelectItem value="GatedByProvider">{t`Gated by Provider`}</SelectItem>
          </SelectContent>
        </Select>
        {!isLoading && (
          <Text size="sm" textColor="muted" className="ml-auto">
            {filtered.length === (data?.items?.length ?? 0) ? (
              <Trans>{filtered.length} services</Trans>
            ) : (
              <Trans>
                {filtered.length} of {data?.items?.length ?? 0} services
              </Trans>
            )}
          </Text>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
            <Text size="sm" textColor="muted">
              {data?.items?.length ? (
                <Trans>No services match the current filters.</Trans>
              ) : (
                <Trans>No services found.</Trans>
              )}
            </Text>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s) => (
            <ServiceCard key={s.metadata?.name ?? ''} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}

import { BadgeState } from '@/components/badge';
import {
  formatChargeType,
  getServicePricingDisplayName,
  getServicePricingSubtext,
  indexServicesByRef,
  resolveServicePricingCatalogService,
  summarizeServicePricing,
  type ServicePricingCatalogService,
} from '@/features/billing/utils';
import { useServiceListQuery } from '@/resources/request/client';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1Offer } from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisBillingV1Alpha1ServicePricing } from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo } from 'react';
import { Link } from 'react-router';

type OfferPricingSnapshot = NonNullable<
  NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>['servicePricings']
>[number];

type OfferIncludedPricingListProps = {
  snapshots: OfferPricingSnapshot[];
  refs: NonNullable<NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>['servicePricingRefs']>;
  pricings: ComMiloapisBillingV1Alpha1ServicePricing[];
  isLoading?: boolean;
  /** Table layout for detail pages; default list for narrower contexts. */
  variant?: 'list' | 'table';
};

function snapshotAsPricing(snapshot: OfferPricingSnapshot): ComMiloapisBillingV1Alpha1ServicePricing {
  return {
    metadata: { name: snapshot.name },
    spec: snapshot.spec,
  };
}

function IncludedPricingRow({
  pricing,
  catalogService,
}: {
  pricing: ComMiloapisBillingV1Alpha1ServicePricing;
  catalogService?: ServicePricingCatalogService;
}) {
  const name = pricing.metadata?.name ?? '';
  const chargeType = pricing.spec?.chargeType ?? '';
  const displayName = getServicePricingDisplayName(pricing);
  const summary = summarizeServicePricing(pricing);
  const subtext = getServicePricingSubtext(pricing, displayName);

  return (
    <li className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{displayName}</span>
        {chargeType ? <BadgeState state={formatChargeType(chargeType)} /> : null}
      </div>
      {summary ? (
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{summary}</p>
      ) : null}
      {catalogService ? (
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          <Trans>From</Trans>{' '}
          <Link
            to={serviceCatalogRoutes.detail(catalogService.catalogName)}
            className="text-primary font-medium hover:underline">
            {catalogService.displayName}
          </Link>
          {catalogService.canonicalName ? (
            <span className="font-mono text-[11px]"> · {catalogService.canonicalName}</span>
          ) : null}
        </p>
      ) : null}
      {subtext ? (
        <p className="text-muted-foreground mt-0.5 font-mono text-[11px] leading-relaxed">{subtext}</p>
      ) : null}
      {!summary && !catalogService && !subtext && name ? (
        <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">{name}</p>
      ) : null}
    </li>
  );
}

function IncludedPricingListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y rounded-md border" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2 p-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      ))}
    </div>
  );
}

function IncludedPricingTable({
  items,
  servicesByRef,
}: {
  items: ComMiloapisBillingV1Alpha1ServicePricing[];
  servicesByRef: ReturnType<typeof indexServicesByRef>;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
            <th className="px-3 py-2 font-medium">
              <Trans>Charge</Trans>
            </th>
            <th className="px-3 py-2 font-medium">
              <Trans>Type</Trans>
            </th>
            <th className="px-3 py-2 font-medium">
              <Trans>Rate</Trans>
            </th>
            <th className="px-3 py-2 font-medium">
              <Trans>Service</Trans>
            </th>
            <th className="hidden px-3 py-2 font-medium xl:table-cell">
              <Trans>Metric</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((pricing) => {
            const name = pricing.metadata?.name ?? '';
            const chargeType = pricing.spec?.chargeType ?? '';
            const displayName = getServicePricingDisplayName(pricing);
            const summary = summarizeServicePricing(pricing);
            const catalogService = resolveServicePricingCatalogService(pricing, servicesByRef);
            const subtext = getServicePricingSubtext(pricing, displayName);
            const metric = pricing.spec?.metric?.trim();

            return (
              <tr key={name || displayName} className="border-b last:border-b-0">
                <td className="px-3 py-2 align-top">
                  <div className="font-medium">{displayName}</div>
                  {subtext ? (
                    <div className="text-muted-foreground mt-0.5 font-mono text-[11px]">{subtext}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 align-top">
                  {chargeType ? <BadgeState state={formatChargeType(chargeType)} /> : '—'}
                </td>
                <td className="text-muted-foreground px-3 py-2 align-top text-xs leading-relaxed">
                  {summary ?? '—'}
                </td>
                <td className="px-3 py-2 align-top text-xs">
                  {catalogService ? (
                    <Link
                      to={serviceCatalogRoutes.detail(catalogService.catalogName)}
                      className="text-primary font-medium hover:underline">
                      {catalogService.displayName}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="text-muted-foreground hidden px-3 py-2 align-top font-mono text-[11px] xl:table-cell">
                  {metric ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IncludedPricingTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-md border" aria-busy="true">
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-3 px-3 py-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OfferIncludedPricingList({
  snapshots,
  refs,
  pricings,
  isLoading,
  variant = 'list',
}: OfferIncludedPricingListProps) {
  const servicesQuery = useServiceListQuery();
  const servicesByRef = useMemo(
    () => indexServicesByRef(servicesQuery.data?.items ?? []),
    [servicesQuery.data?.items]
  );

  const includedPricings = useMemo(() => {
    if (snapshots.length > 0) {
      return snapshots.map(snapshotAsPricing);
    }

    const refNames = new Set(refs.map((ref) => ref.name));
    return pricings.filter((pricing) => refNames.has(pricing.metadata?.name ?? ''));
  }, [snapshots, refs, pricings]);

  if (isLoading && includedPricings.length === 0 && refs.length > 0) {
    return variant === 'table' ? (
      <IncludedPricingTableSkeleton rows={refs.length} />
    ) : (
      <IncludedPricingListSkeleton rows={refs.length} />
    );
  }

  if (includedPricings.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        <Trans>No charges included in this Offer.</Trans>
      </Text>
    );
  }

  if (variant === 'table') {
    return <IncludedPricingTable items={includedPricings} servicesByRef={servicesByRef} />;
  }

  return (
    <ul className="divide-y rounded-md border">
      {includedPricings.map((pricing) => (
        <IncludedPricingRow
          key={pricing.metadata?.name ?? pricing.spec?.displayName}
          pricing={pricing}
          catalogService={resolveServicePricingCatalogService(pricing, servicesByRef)}
        />
      ))}
    </ul>
  );
}

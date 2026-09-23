import { BadgeState } from '@/components/badge';
import {
  formatChargeType,
  getServicePricingDisplayName,
  getServicePricingSubtext,
  indexServicesByRef,
  resolveServicePricingCatalogService,
  summarizeServicePricing,
} from '@/features/billing/utils';
import { useServiceListQuery } from '@/resources/request/client';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1ServicePricing } from '@openapi/billing.miloapis.com/v1alpha1';
import { Tag } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

function ServicePricingListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="max-h-64 space-y-3 overflow-hidden rounded-md border p-3"
      aria-busy="true"
      aria-label="Loading service pricings">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-2">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-2/3 max-w-[220px]" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ServicePricingEmptyState() {
  return (
    <div className="bg-muted/30 flex flex-col items-center gap-4 rounded-md border border-dashed px-6 py-8 text-center">
      <div className="bg-background flex size-11 items-center justify-center rounded-full border shadow-sm">
        <Tag className="text-muted-foreground size-5" />
      </div>

      <div className="flex max-w-md flex-col gap-2">
        <Text as="p" weight="medium">
          <Trans>No prices available yet</Trans>
        </Text>
        <Text as="p" textColor="muted" className="leading-relaxed">
          <Trans>
            Offers bundle prices that already exist as ServicePricings. Define charges in git on
            ServiceConfiguration spec.charges, publish the configuration, then refresh to select
            them here.
          </Trans>
        </Text>
      </div>

      <ol className="text-muted-foreground max-w-md list-decimal space-y-1.5 pl-5 text-left text-sm leading-relaxed">
        <li>
          <Trans>
            Add or update spec.charges in your infra repo and publish the configuration.
          </Trans>
        </li>
        <li>
          <Trans>Wait for charge fan-out, then refresh this page.</Trans>
        </li>
        <li>
          <Trans>Select the ServicePricings to include in your Offer.</Trans>
        </li>
      </ol>
    </div>
  );
}

function ServicePricingErrorState({ message }: { message?: string }) {
  return (
    <Alert variant="destructive">
      <STATUS_ICONS.alert className="size-4" />
      <AlertTitle>
        <Trans>Could not load service pricings</Trans>
      </AlertTitle>
      <AlertDescription>
        <p>
          <Trans>
            Check that you have permission to list ServicePricings, then try again. If IAM was just
            updated, wait a minute for PolicyBindings to reconcile.
          </Trans>
        </p>
        {message ? (
          <Text as="p" size="xs" className="mt-2 font-mono opacity-80">
            {message}
          </Text>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

type ServicePricingChecklistProps = {
  pricings: ComMiloapisBillingV1Alpha1ServicePricing[];
  selectedNames: string[];
  onToggle: (name: string, next: boolean) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
};

export function ServicePricingChecklist({
  pricings,
  selectedNames,
  onToggle,
  isLoading,
  isError,
  errorMessage,
}: ServicePricingChecklistProps) {
  const servicesQuery = useServiceListQuery();
  const servicesByRef = useMemo(
    () => indexServicesByRef(servicesQuery.data?.items ?? []),
    [servicesQuery.data?.items]
  );

  if (isLoading) {
    return <ServicePricingListSkeleton />;
  }

  if (isError) {
    return <ServicePricingErrorState message={errorMessage} />;
  }

  if (pricings.length === 0) {
    return <ServicePricingEmptyState />;
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
      {pricings.map((pricing) => {
        const name = pricing.metadata?.name ?? '';
        const chargeType = pricing.spec?.chargeType ?? '';
        const displayName = getServicePricingDisplayName(pricing);
        const summary = summarizeServicePricing(pricing);
        const catalogService = resolveServicePricingCatalogService(pricing, servicesByRef);
        const subtext = getServicePricingSubtext(pricing, displayName);
        return (
          <label key={name} className="hover:bg-muted/50 flex items-start gap-3 rounded-md p-2">
            <Checkbox
              className="mt-0.5 shrink-0"
              checked={selectedNames.includes(name)}
              onCheckedChange={(next) => onToggle(name, Boolean(next))}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Text weight="medium">{displayName}</Text>
                {chargeType ? <BadgeState state={formatChargeType(chargeType)} /> : null}
              </div>
              {summary ? (
                <Text as="p" size="xs" textColor="muted" className="mt-0.5 leading-relaxed">
                  {summary}
                </Text>
              ) : null}
              {catalogService ? (
                <Text as="p" size="xs" textColor="muted" className="mt-0.5 leading-relaxed">
                  <Trans>From</Trans>{' '}
                  <Link
                    to={serviceCatalogRoutes.detail(catalogService.catalogName)}
                    className="text-primary font-medium hover:underline"
                    onClick={(event) => event.stopPropagation()}>
                    {catalogService.displayName}
                  </Link>
                  {catalogService.canonicalName ? (
                    <Text size="xs" className="font-mono">
                      {' '}
                      · {catalogService.canonicalName}
                    </Text>
                  ) : null}
                </Text>
              ) : null}
              {subtext ? (
                <Text
                  as="p"
                  size="xs"
                  textColor="muted"
                  className="mt-0.5 font-mono leading-relaxed">
                  {subtext}
                </Text>
              ) : null}
            </div>
          </label>
        );
      })}
    </div>
  );
}

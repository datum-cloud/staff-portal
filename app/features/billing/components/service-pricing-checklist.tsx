import { formatChargeType } from '@/features/billing/utils';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1ServicePricing } from '@openapi/billing.miloapis.com/v1alpha1';
import { Tag } from 'lucide-react';

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
    <div className="bg-muted/40 flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-8 text-center">
      <div className="bg-background flex size-10 items-center justify-center rounded-full border">
        <Tag className="text-muted-foreground size-4" />
      </div>
      <div className="space-y-1">
        <Text size="sm" weight="medium">
          <Trans>No service pricings yet</Trans>
        </Text>
        <Text size="sm" textColor="muted" className="max-w-sm">
          <Trans>
            Nothing found in milo-system. Add charges to a ServiceConfiguration so ChargeFanOut can
            emit ServicePricing objects, then refresh this page.
          </Trans>
        </Text>
      </div>
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
        {message ? <p className="mt-2 font-mono text-xs opacity-80">{message}</p> : null}
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
        return (
          <label
            key={name}
            className="hover:bg-muted/50 flex items-start gap-2 rounded-sm p-1 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={selectedNames.includes(name)}
              onCheckedChange={(next) => onToggle(name, Boolean(next))}
            />
            <span className="min-w-0">
              <span className="font-medium">{name}</span>
              {chargeType ? (
                <span className="text-muted-foreground"> · {formatChargeType(chargeType)}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

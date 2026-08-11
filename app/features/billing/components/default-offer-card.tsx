import { SectionCard } from '@/features/milo';
import {
  useBillingDefaultOfferQuery,
  useSetBillingDefaultOfferMutation,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';

type DefaultOfferCardProps = {
  offerName: string;
  /** Only GA Offers with a snapshot may be set as default (admission). */
  canSetAsDefault: boolean;
};

export function DefaultOfferCard({ offerName, canSetAsDefault }: DefaultOfferCardProps) {
  const defaultOfferQuery = useBillingDefaultOfferQuery();
  const setDefaultMutation = useSetBillingDefaultOfferMutation();

  const currentDefault = defaultOfferQuery.data ?? '';
  const isDefault = currentDefault === offerName;

  const handleSetDefault = async () => {
    if (
      !window.confirm(
        t`Set "${offerName}" as the platform default Offer? New billing accounts and existing accounts with no BillingEntitlement are entitled automatically. Accounts that already have a BillingEntitlement are not migrated.`
      )
    ) {
      return;
    }
    try {
      await setDefaultMutation.mutateAsync(offerName);
      toast.success(t`Default Offer updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to set default Offer`);
    }
  };

  return (
    <SectionCard title={<Trans>Platform default</Trans>}>
      {defaultOfferQuery.isLoading ? (
        <Text size="sm" className="text-muted-foreground">
          <Trans>Loading default Offer…</Trans>
        </Text>
      ) : defaultOfferQuery.isError ? (
        <Text size="sm" className="text-muted-foreground">
          <Trans>
            Could not read the billing ServiceConfiguration default. Check that you can get
            serviceconfigurations.
          </Trans>
        </Text>
      ) : (
        <div className="space-y-4">
          <Text size="sm" className="text-muted-foreground">
            {isDefault ? (
              <Trans>
                This Offer is the platform default. New accounts and accounts without a
                BillingEntitlement pick it up automatically.
              </Trans>
            ) : currentDefault ? (
              <Trans>
                Current default is {currentDefault}. Setting this Offer replaces that default for
                accounts that do not yet have an entitlement.
              </Trans>
            ) : (
              <Trans>
                No platform default is configured yet. Set a GA Offer here so new billing accounts
                are entitled automatically.
              </Trans>
            )}
          </Text>
          {isDefault ? (
            <Text size="sm" weight="medium">
              <Trans>This is the default Offer</Trans>
            </Text>
          ) : (
            <Button
              type="secondary"
              theme="outline"
              disabled={!canSetAsDefault || setDefaultMutation.isPending}
              loading={setDefaultMutation.isPending}
              onClick={handleSetDefault}>
              <Trans>Set as default</Trans>
            </Button>
          )}
          {!canSetAsDefault && !isDefault ? (
            <Text size="sm" className="text-muted-foreground">
              <Trans>
                Publish this Offer (GA with a pricing snapshot) before setting it as default.
              </Trans>
            </Text>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

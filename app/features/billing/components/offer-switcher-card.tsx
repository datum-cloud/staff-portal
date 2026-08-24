import { BadgeState } from '@/components/badge';
import { DialogConfirm } from '@/components/dialog';
import { getOfferDisplayName, formatLaunchStage } from '@/features/billing/utils';
import { SectionCard } from '@/features/milo';
import {
  useOfferDetailQuery,
  useOfferListQuery,
  useSwitchBillingEntitlementOfferMutation,
} from '@/resources/request/client';
import { offerRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingEntitlement } from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

type OfferSwitcherCardProps = {
  orgName: string;
  accountName: string;
  billingEntitlement: ComMiloapisBillingV1Alpha1BillingEntitlement | null;
};

export function OfferSwitcherCard({
  orgName,
  accountName,
  billingEntitlement,
}: OfferSwitcherCardProps) {
  const activeOfferName = billingEntitlement?.spec?.offerRef?.name ?? '';
  const entitlementName = billingEntitlement?.metadata?.name ?? '';
  const activeOfferQuery = useOfferDetailQuery(activeOfferName);
  const offersQuery = useOfferListQuery({ limit: 500 });
  const switchMutation = useSwitchBillingEntitlementOfferMutation(orgName, accountName);

  const gaOffers = useMemo(
    () =>
      (offersQuery.data?.items ?? []).filter(
        (offer) =>
          offer.spec?.launchStage === 'GA' &&
          (offer.spec?.servicePricings?.length ?? 0) > 0 &&
          !offer.metadata?.deletionTimestamp
      ),
    [offersQuery.data?.items]
  );

  const [selectedOffer, setSelectedOffer] = useState('');
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);

  const activeLaunchStage = activeOfferQuery.data?.spec?.launchStage ?? '';
  const switchableOffers = useMemo(
    () => gaOffers.filter((offer) => offer.metadata?.name !== activeOfferName),
    [gaOffers, activeOfferName]
  );

  const activeDisplayName = activeOfferQuery.data
    ? getOfferDisplayName(activeOfferQuery.data)
    : activeOfferName;

  const handleSwitchClick = () => {
    if (!entitlementName || !selectedOffer) return;
    if (selectedOffer === activeOfferName) {
      toast.success(t`Account is already on that Offer`);
      return;
    }
    setSwitchConfirmOpen(true);
  };

  const handleSwitchConfirm = async () => {
    if (!entitlementName || !selectedOffer) return;
    try {
      await switchMutation.mutateAsync({
        entitlementName,
        offerName: selectedOffer,
      });
      toast.success(t`Offer switched`);
      setSelectedOffer('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to switch Offer`);
      throw err;
    }
  };

  return (
    <SectionCard title={<Trans>Active Offer</Trans>}>
      {!billingEntitlement ? (
        <Text size="sm" className="text-muted-foreground">
          <Trans>
            No BillingEntitlement found for this account. New accounts pick up the default Offer
            automatically when catalog defaults are configured.
          </Trans>
        </Text>
      ) : (
        <div className="space-y-4">
          <div>
            <Text size="sm" className="text-muted-foreground">
              <Trans>Current Offer</Trans>
            </Text>
            {activeOfferName ? (
              <div className="mt-1.5 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={offerRoutes.detail(activeOfferName)} className="font-medium underline">
                    {activeDisplayName || activeOfferName}
                  </Link>
                  {activeLaunchStage ? (
                    <BadgeState
                      state={activeLaunchStage}
                      message={formatLaunchStage(activeLaunchStage)}
                    />
                  ) : null}
                </div>
                <Text size="sm" className="text-muted-foreground font-mono text-xs">
                  {activeOfferName}
                </Text>
              </div>
            ) : (
              <Text className="mt-1">—</Text>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <Text size="sm" weight="medium" className="block">
              <Trans>Switch to published Offer</Trans>
            </Text>
            {switchableOffers.length === 0 ? (
              <Text size="sm" className="text-muted-foreground block">
                <Trans>No other published Offers are available to switch to.</Trans>
              </Text>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={selectedOffer || undefined} onValueChange={setSelectedOffer}>
                  <SelectTrigger className="w-full sm:max-w-md">
                    <SelectValue placeholder={t`Select a GA Offer`} />
                  </SelectTrigger>
                  <SelectContent>
                    {switchableOffers.map((offer) => {
                      const name = offer.metadata?.name ?? '';
                      return (
                        <SelectItem key={name} value={name}>
                          {getOfferDisplayName(offer)} ({name})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  type="primary"
                  className="sm:w-auto"
                  disabled={!selectedOffer}
                  onClick={handleSwitchClick}>
                  <Trans>Switch</Trans>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <DialogConfirm
        open={switchConfirmOpen}
        onOpenChange={setSwitchConfirmOpen}
        title={t`Switch Offer`}
        description={t`Switch this billing account to Offer "${selectedOffer}"? Amberflo Customer-Plan and quota grants will update on reconcile.`}
        confirmText={t`Switch`}
        cancelText={t`Cancel`}
        onConfirm={handleSwitchConfirm}
      />
    </SectionCard>
  );
}

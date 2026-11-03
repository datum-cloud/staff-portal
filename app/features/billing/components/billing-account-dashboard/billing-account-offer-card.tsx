import {
  getEntitlementActiveSince,
  getOfferPricingCount,
  getOfferServices,
} from '../../lib/offer-summary';
import { formatLaunchStage, getOfferDisplayName, indexServicesByRef } from '../../utils';
import { BILLING_ACCOUNT_SECTION_IDS } from './billing-account-attention-banner';
import { CardMessage, SectionAnchor, InlineDate } from './card-parts';
import { BadgeState } from '@/components/badge';
import { DialogForm } from '@/components/dialog';
import { SectionCard } from '@/features/milo';
import {
  useBillingEntitlementForAccountQuery,
  useOfferDetailQuery,
  useOfferListQuery,
  useServiceListQuery,
  useSwitchBillingEntitlementOfferMutation,
} from '@/resources/request/client';
import { offerRoutes, serviceCatalogRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingEntitlement } from '@openapi/billing.miloapis.com/v1alpha1';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';

interface OfferCardProps {
  orgName: string;
  accountName: string;
  /** The switch dialog, held by the page so its header can open it too. */
  switchOpen: boolean;
  onSwitchOpenChange: (open: boolean) => void;
}

/**
 * The account's active offer, and a dialog to switch it to another
 * published (GA) offer.
 */
export function BillingAccountOfferCard({
  orgName,
  accountName,
  switchOpen,
  onSwitchOpenChange,
}: OfferCardProps) {
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  const entitlement = entitlementQuery.data ?? null;

  return (
    <SectionAnchor id={BILLING_ACCOUNT_SECTION_IDS.offer}>
      <SectionCard
        title={<Trans>Offer</Trans>}
        action={
          entitlement ? (
            <Button
              type="quaternary"
              theme="borderless"
              size="small"
              onClick={() => onSwitchOpenChange(true)}
              icon={<Icon icon={ArrowRight} size={14} />}
              iconPosition="right">
              <Trans>Switch offer</Trans>
            </Button>
          ) : undefined
        }>
        {entitlementQuery.isLoading ? (
          <div className="flex flex-col gap-1.5" aria-busy="true">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        ) : entitlementQuery.isError ? (
          <CardMessage className="py-0">
            <Trans>Couldn&apos;t load the account&apos;s offer.</Trans>
          </CardMessage>
        ) : !entitlement ? (
          <CardMessage className="py-0">
            <Trans>
              No BillingEntitlement found for this account. New accounts pick up the default Offer
              automatically when catalog defaults are configured.
            </Trans>
          </CardMessage>
        ) : (
          <ActiveOffer entitlement={entitlement} />
        )}
      </SectionCard>
      {entitlement ? (
        <SwitchOfferDialog
          orgName={orgName}
          accountName={accountName}
          entitlement={entitlement}
          open={switchOpen}
          onOpenChange={onSwitchOpenChange}
        />
      ) : null}
    </SectionAnchor>
  );
}

/** Most service chips before the rest collapse into "+N more". */
const MAX_SERVICES = 6;

function ActiveOffer({
  entitlement,
}: {
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement;
}) {
  const offerName = entitlement.spec?.offerRef?.name ?? '';
  const offerQuery = useOfferDetailQuery(offerName);
  const servicesQuery = useServiceListQuery();
  const servicesByRef = useMemo(
    () => indexServicesByRef(servicesQuery.data?.items ?? []),
    [servicesQuery.data?.items]
  );
  const offer = offerQuery.data;
  const services = useMemo(
    () => (offer ? getOfferServices(offer, servicesByRef) : []),
    [offer, servicesByRef]
  );
  const activeSince = getEntitlementActiveSince(entitlement);
  const launchStage = offer?.spec?.launchStage ?? '';
  const discount = offer?.spec?.discount?.percentage;
  const pricingCount = offer ? getOfferPricingCount(offer) : 0;

  if (!offerName) return <Text size="sm">—</Text>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={offerRoutes.detail(offerName)}
            className="text-primary text-lg font-medium hover:underline">
            {offer ? getOfferDisplayName(offer) : offerName}
          </Link>
          {launchStage ? (
            <BadgeState state={launchStage} message={formatLaunchStage(launchStage)} />
          ) : null}
        </div>
        <Text size="xs" textColor="muted">
          <span className="font-mono">{offerName}</span>
          {activeSince ? (
            <>
              {' · '}
              <Trans>
                active since{' '}
                <InlineDate date={activeSince} variant="absolute" format="MMM d, yyyy" />
              </Trans>
            </>
          ) : null}
        </Text>
      </div>

      {offerQuery.isLoading ? (
        <Skeleton className="h-6 w-full rounded" />
      ) : offer ? (
        <div className="flex flex-col gap-2 border-t pt-3">
          <Text size="xs" textColor="muted">
            {pricingCount === 1 ? <Trans>1 price</Trans> : <Trans>{pricingCount} prices</Trans>}
            {discount ? (
              <>
                {' · '}
                <Trans>{discount}% off</Trans>
              </>
            ) : null}
          </Text>
          {services.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={t`Services included`}>
              {services.slice(0, MAX_SERVICES).map((service) => (
                <li key={service.catalogName}>
                  <Link
                    to={serviceCatalogRoutes.detail(service.catalogName)}
                    className="border-border bg-background hover:border-foreground/30 inline-flex rounded-md border px-2 py-0.5 transition-colors">
                    <Text as="span" size="xs">
                      {service.displayName}
                    </Text>
                  </Link>
                </li>
              ))}
              {services.length > MAX_SERVICES ? (
                <li>
                  <Link
                    to={offerRoutes.detail(offerName)}
                    className="text-muted-foreground inline-flex px-1 py-0.5 hover:underline">
                    <Text as="span" size="xs" textColor="muted">
                      <Trans>+{services.length - MAX_SERVICES} more</Trans>
                    </Text>
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const switchOfferSchema = z.object({ offerName: z.string().min(1) });

function SwitchOfferDialog({
  orgName,
  accountName,
  entitlement,
  open,
  onOpenChange,
}: {
  orgName: string;
  accountName: string;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activeOfferName = entitlement.spec?.offerRef?.name ?? '';
  const entitlementName = entitlement.metadata?.name ?? '';
  const offersQuery = useOfferListQuery({ limit: 500 });
  const switchMutation = useSwitchBillingEntitlementOfferMutation(orgName, accountName);

  const switchableOffers = useMemo(
    () =>
      (offersQuery.data?.items ?? []).filter(
        (offer) =>
          offer.spec?.launchStage === 'GA' &&
          (offer.spec?.servicePricings?.length ?? 0) > 0 &&
          !offer.metadata?.deletionTimestamp &&
          offer.metadata?.name !== activeOfferName
      ),
    [offersQuery.data?.items, activeOfferName]
  );

  const handleSubmit = async ({ offerName }: z.infer<typeof switchOfferSchema>) => {
    if (!entitlementName) return;
    try {
      await switchMutation.mutateAsync({ entitlementName, offerName });
      toast.success(t`Offer switched`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to switch Offer`);
      throw err; // keep the dialog open
    }
  };

  return (
    <DialogForm
      // Remount on each open so the picker starts empty.
      key={open ? 'open' : 'closed'}
      open={open}
      onOpenChange={onOpenChange}
      title={t`Switch Offer`}
      description={t`Move this billing account to another published Offer. The customer's plan and quota grants update on reconcile.`}
      submitText={t`Switch`}
      cancelText={t`Cancel`}
      schema={switchOfferSchema}
      defaultValues={{ offerName: '' }}
      onSubmit={handleSubmit}>
      {offersQuery.isLoading ? (
        <Skeleton className="h-9 w-full rounded" />
      ) : switchableOffers.length === 0 ? (
        <Text size="sm" textColor="muted">
          <Trans>No other published Offers are available to switch to.</Trans>
        </Text>
      ) : (
        <Form.Field name="offerName" label={t`Offer`} required>
          <Form.Select placeholder={t`Select a GA Offer`}>
            {switchableOffers.map((offer) => {
              const name = offer.metadata?.name ?? '';
              return (
                <Form.SelectItem key={name} value={name}>
                  {getOfferDisplayName(offer)} ({name})
                </Form.SelectItem>
              );
            })}
          </Form.Select>
        </Form.Field>
      )}
    </DialogForm>
  );
}

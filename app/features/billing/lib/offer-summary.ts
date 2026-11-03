import {
  resolveServicePricingCatalogService,
  snapshotAsPricing,
  type ServicePricingCatalogService,
} from '../utils';
import type {
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisServicesV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';

/** Selectors for the billing account dashboard's offer card. */

export interface OfferService extends ServicePricingCatalogService {
  /** How many of the offer's prices are for this service. */
  pricingCount: number;
}

/**
 * The services an offer prices, from its pricing snapshots, one entry per
 * service in name order. Empty when the offer has no snapshots yet.
 */
export const getOfferServices = (
  offer: ComMiloapisBillingV1Alpha1Offer,
  servicesByRef: Map<string, ComMiloapisServicesV1Alpha1Service>
): OfferService[] => {
  const services = (offer.spec?.servicePricings ?? [])
    .map((snapshot) =>
      resolveServicePricingCatalogService(snapshotAsPricing(snapshot), servicesByRef)
    )
    .filter((service): service is ServicePricingCatalogService => Boolean(service));

  const byName = services.reduce((map, service) => {
    const existing = map.get(service.catalogName);
    return map.set(service.catalogName, {
      ...service,
      pricingCount: (existing?.pricingCount ?? 0) + 1,
    });
  }, new Map<string, OfferService>());

  return [...byName.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
};

/** How many prices the offer has, from snapshots or, before those exist, refs. */
export const getOfferPricingCount = (offer: ComMiloapisBillingV1Alpha1Offer): number =>
  offer.spec?.servicePricings?.length ?? offer.spec?.servicePricingRefs?.length ?? 0;

/** When the entitlement last became Ready, i.e. the account has been on its offer since. */
export const getEntitlementActiveSince = (
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement
): string | undefined => {
  const ready = entitlement.status?.conditions?.find((condition) => condition.type === 'Ready');
  return ready?.status === 'True' ? ready.lastTransitionTime : undefined;
};

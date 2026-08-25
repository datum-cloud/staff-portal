import { parseCatalogRates, type CatalogMeterPricing } from './usage-spend';
import type { MeterDefinition } from './usage.types';
import { BILLING_SERVICE_CONFIGURATION_NAME } from '@/features/billing/utils';
import { getOrgControlPlaneBaseURL } from '@/resources/request/client/apis/control-plane';
import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';
import {
  listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  readBillingMiloapisComV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import type { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

export interface CatalogUsagePricing {
  offerName?: string;
  /** metric name (spec.metric) → pricing */
  byMetric: Map<string, CatalogMeterPricing>;
  /** meterApiName → metric name */
  meterNameByApiName: Map<string, string>;
}

function orgNamespace(orgName: string) {
  return `organization-${orgName}`;
}

async function fetchBillingDefaultOffer(token: string): Promise<string | undefined> {
  try {
    const url = `${env.API_URL}/apis/services.miloapis.com/v1alpha1/serviceconfigurations/${BILLING_SERVICE_CONFIGURATION_NAME}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!resp.ok) return undefined;
    const json = (await resp.json()) as { spec?: { defaultOffer?: string } };
    const name = json.spec?.defaultOffer?.trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

async function resolveOfferNameForAccount(
  orgName: string,
  token: string,
  billingAccountName: string | undefined
): Promise<string | undefined> {
  if (billingAccountName) {
    try {
      const resp = await listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement({
        baseURL: getOrgControlPlaneBaseURL(orgName),
        path: { namespace: orgNamespace(orgName) },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = resp.data as unknown as UnwrapProxyResponse<typeof resp.data>;
      const entitlement = (data?.items ?? []).find(
        (item) => item.spec?.billingAccountRef?.name === billingAccountName
      );
      const offerName = entitlement?.spec?.offerRef?.name?.trim();
      if (offerName) return offerName;
    } catch (error) {
      logger.warn('Failed to load BillingEntitlement for usage pricing', {
        err: error,
        orgName,
        billingAccountName,
      });
    }
  }

  return fetchBillingDefaultOffer(token);
}

function pricingFromOfferSnapshots(
  snapshots:
    | Array<{
        name?: string;
        spec?: {
          chargeType?: string;
          metric?: string;
          pricingUnit?: string;
          currency?: string;
          rates?: Array<{
            flat?: string;
            match?: { dimension: string; value: string };
            tiered?: Array<{ upTo?: string; rate: string }>;
          }>;
        };
      }>
    | undefined
): Map<string, CatalogMeterPricing> {
  const byMetric = new Map<string, CatalogMeterPricing>();

  for (const snap of snapshots ?? []) {
    const spec = snap.spec;
    if (spec?.chargeType !== 'Usage' || !spec.metric) continue;

    const rates = parseCatalogRates(spec.rates);
    if (rates.length === 0) continue;

    byMetric.set(spec.metric, {
      metric: spec.metric,
      pricingUnit: spec.pricingUnit?.trim() || 'unit',
      currency: spec.currency?.trim() || 'USD',
      rates,
    });
  }

  return byMetric;
}

function indexMeterNames(meterDefs: MeterDefinition[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const def of meterDefs) {
    if (def.meterApiName && def.meterName) {
      map.set(def.meterApiName, def.meterName);
    }
  }
  return map;
}

/**
 * Load GA Offer pricing snapshots for the org's billing account (or platform
 * default offer) and index them by metric / meter id.
 */
export async function loadCatalogUsagePricing(
  orgName: string,
  token: string,
  options: {
    billingAccountName?: string;
    meterDefs: MeterDefinition[];
  }
): Promise<CatalogUsagePricing> {
  const meterNameByApiName = indexMeterNames(options.meterDefs);
  const offerName = await resolveOfferNameForAccount(orgName, token, options.billingAccountName);

  if (!offerName) {
    return { byMetric: new Map(), meterNameByApiName };
  }

  try {
    const resp = await readBillingMiloapisComV1Alpha1Offer({
      path: { name: offerName },
      headers: { Authorization: `Bearer ${token}` },
    });
    const offer = resp.data as unknown as UnwrapProxyResponse<typeof resp.data>;
    const snapshots = offer?.spec?.servicePricings ?? [];

    return {
      offerName,
      byMetric: pricingFromOfferSnapshots(snapshots),
      meterNameByApiName,
    };
  } catch (error) {
    logger.warn('Failed to load Offer for usage pricing', { err: error, offerName });
    return { offerName, byMetric: new Map(), meterNameByApiName };
  }
}

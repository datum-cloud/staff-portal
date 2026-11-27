import { resolveOfferServiceDiscounts } from '../../lib/offer-discounts';
import {
  getServicePricingDisplayName,
  indexServicesByRef,
  resolveServicePricingCatalogService,
  snapshotAsPricing,
  summarizeServicePricing,
} from '../../utils';
import { CardMessage } from './card-parts';
import { useServiceListQuery, type ServicePricing } from '@/resources/request/client';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1Offer } from '@openapi/billing.miloapis.com/v1alpha1';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

/** Prices before the list gets a search box. */
const SEARCH_FROM = 15;

interface PriceRow {
  name: string;
  label: string;
  rate: string;
  /** The list pricing's rate, when the customer has their own. */
  listRate?: string;
  discount: number;
}

/**
 * What an account pays, from its offer: its prices by service, one line
 * each, with the services closed until asked for, so an offer with dozens
 * of prices takes the room of one with a handful. A customer's own price
 * shows the list rate beside it, and a discount what it takes off. Past a
 * screenful there's a search, which opens every service with a match.
 */
export function AccountPriceList({
  offer,
  pricings,
}: {
  offer: ComMiloapisBillingV1Alpha1Offer;
  /** The platform's pricings, for the list rate behind a customer's price. */
  pricings: ServicePricing[];
}) {
  const servicesQuery = useServiceListQuery();
  const servicesByRef = useMemo(
    () => indexServicesByRef(servicesQuery.data?.items ?? []),
    [servicesQuery.data?.items]
  );
  const groups = useMemo(() => {
    const snapshots = offer.spec?.servicePricings ?? [];
    const refNames = new Set((offer.spec?.servicePricingRefs ?? []).map((ref) => ref.name));
    // A published offer bills from its snapshots; before they're written,
    // from the pricings it names.
    const included =
      snapshots.length > 0
        ? snapshots.map(snapshotAsPricing)
        : pricings.filter((pricing) => refNames.has(pricing.metadata?.name ?? ''));
    const listByName = new Map(pricings.map((pricing) => [pricing.metadata?.name ?? '', pricing]));
    const discounts = resolveOfferServiceDiscounts(offer.spec);
    const byService = new Map<string, PriceRow[]>();
    for (const pricing of included) {
      const name = pricing.metadata?.name ?? '';
      const service =
        resolveServicePricingCatalogService(pricing, servicesByRef)?.displayName ?? '';
      const rate = summarizeServicePricing(pricing) ?? '';
      const list = pricing.spec?.basedOn ? listByName.get(pricing.spec.basedOn) : undefined;
      const listRate = list ? summarizeServicePricing(list) : undefined;
      const row: PriceRow = {
        name,
        label: getServicePricingDisplayName(pricing),
        rate,
        listRate: listRate && listRate !== rate ? listRate : undefined,
        discount: discounts.get(name)?.percentage ?? 0,
      };
      byService.set(service, [...(byService.get(service) ?? []), row]);
    }
    // Prices that aren't for a service go last.
    return [...byService.entries()].sort(
      ([a], [b]) => Number(a === '') - Number(b === '') || a.localeCompare(b)
    );
  }, [offer, pricings, servicesByRef]);

  const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0);
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const query = search.trim().toLowerCase();

  if (total === 0) {
    return (
      <CardMessage className="py-0">
        <Trans>The account&apos;s offer has no prices.</Trans>
      </CardMessage>
    );
  }

  const shown = groups
    .map(([service, rows]) => {
      const title = service || t`Not for a service`;
      const matches =
        !query || title.toLowerCase().includes(query)
          ? rows
          : rows.filter((row) => `${row.label} ${row.name}`.toLowerCase().includes(query));
      return { service, title, rows: matches };
    })
    .filter((group) => group.rows.length > 0);
  const toggle = (service: string) =>
    setOpened((current) => {
      const next = new Set(current);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      {total > SEARCH_FROM ? (
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t`Search prices`}
          aria-label={t`Search prices`}
          className="h-9 w-full sm:w-64"
        />
      ) : null}
      {shown.length === 0 ? (
        <CardMessage className="py-0">
          <Trans>No price matches “{search.trim()}”.</Trans>
        </CardMessage>
      ) : (
        <ul className="divide-y rounded-md border">
          {shown.map((group) => {
            // One service has nothing to choose between, and a search
            // shows what it found.
            const open = groups.length === 1 || query !== '' || opened.has(group.service);
            return (
              <li key={group.service}>
                <button
                  type="button"
                  className="hover:bg-muted/40 flex w-full items-center gap-1.5 px-3 py-2 text-left"
                  aria-expanded={open}
                  onClick={() => toggle(group.service)}>
                  <Icon
                    icon={open ? ChevronDown : ChevronRight}
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                  <Text as="span" size="sm" weight="medium">
                    {group.title}
                  </Text>
                  <Text as="span" size="sm" textColor="muted">
                    {' · '}
                    <Plural value={group.rows.length} one="# price" other="# prices" />
                  </Text>
                </button>
                {open ? (
                  <ul className="flex flex-col gap-1 px-3 pb-2.5 pl-8">
                    {group.rows.map((row) => (
                      <PriceLine key={row.name} row={row} />
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * One price on a line: its name, then its rate, the list rate
 * when the customer's differs, and any discount. Its pricing's own name is
 * on hover, for staff who need to look it up.
 */
function PriceLine({ row }: { row: PriceRow }) {
  const { listRate, discount } = row;
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4" title={row.name}>
      <Text as="span" size="sm">
        {row.label}
      </Text>
      <Text as="span" size="sm" className="text-right tabular-nums">
        {row.rate || '—'}
        {listRate || discount > 0 ? (
          <Text as="span" size="xs" textColor="muted">
            {listRate ? <Trans>, list {listRate}</Trans> : null}
            {discount > 0 ? (
              <>
                {' · '}
                <Trans>{discount}% off</Trans>
              </>
            ) : null}
          </Text>
        ) : null}
      </Text>
    </li>
  );
}

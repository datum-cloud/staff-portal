import { AmexMark } from './card-brand-icons/amex';
import { DinersMark } from './card-brand-icons/diners';
import { DiscoverMark } from './card-brand-icons/discover';
import { GenericMark } from './card-brand-icons/generic';
import { JcbMark } from './card-brand-icons/jcb';
import { MastercardMark } from './card-brand-icons/mastercard';
import { UnionPayMark } from './card-brand-icons/unionpay';
import { VisaMark } from './card-brand-icons/visa';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ComponentType } from 'react';

/**
 * Card brand marks, copied from cloud-portal
 * (`app/features/billing/components/card-brand-icon.tsx`) so both portals
 * show cards the same way.
 *
 * The artwork is sourced from the Apache-2.0 licensed
 * [aaronfagan/svg-credit-card-payment-icons](https://github.com/aaronfagan/svg-credit-card-payment-icons)
 * (mono set), with the source `#393939` recoloured to `currentColor` so it
 * adapts to the theme foreground.
 */

type CardBrand =
  'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unionpay' | 'unknown';

/**
 * `PaymentMethod.status.details.card.brand` is a free-form string (Stripe's
 * vocabulary today), so map it onto the brands the icon set draws.
 */
const normalizeCardBrand = (brand: string | undefined | null): CardBrand => {
  if (!brand) return 'unknown';
  const slug = brand.toLowerCase().replace(/[\s_-]+/g, '');
  switch (slug) {
    case 'visa':
      return 'visa';
    case 'mastercard':
    case 'mc':
      return 'mastercard';
    case 'amex':
    case 'americanexpress':
      return 'amex';
    case 'discover':
      return 'discover';
    case 'diners':
    case 'dinersclub':
      return 'diners';
    case 'jcb':
      return 'jcb';
    case 'unionpay':
    case 'cup':
      return 'unionpay';
    default:
      return 'unknown';
  }
};

const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  unknown: 'Card',
};

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/** The brand's name; an unknown brand keeps the API's own name. */
const getCardBrandLabel = (brand: string | undefined | null): string => {
  const key = normalizeCardBrand(brand);
  return key === 'unknown' && brand ? capitalize(brand) : CARD_BRAND_LABELS[key];
};

/** E.g. `Visa •••• 4242`; `fallback` (the payment method's name) without the last four digits. */
export const formatCardLabel = (
  card: { brand?: string; last4?: string } | undefined,
  fallback: string
): string => (card?.last4 ? `${getCardBrandLabel(card.brand)} •••• ${card.last4}` : fallback);

const brandRenderers: Record<CardBrand, ComponentType<{ className?: string }>> = {
  visa: VisaMark,
  mastercard: MastercardMark,
  amex: AmexMark,
  discover: DiscoverMark,
  diners: DinersMark,
  jcb: JcbMark,
  unionpay: UnionPayMark,
  unknown: GenericMark,
};

interface CardBrandIconProps {
  brand: string | undefined | null;
  className?: string;
}

export function CardBrandIcon({ brand, className }: CardBrandIconProps) {
  const Renderer = brandRenderers[normalizeCardBrand(brand)];
  // The mono marks draw their own card-shaped body, so the wrapper is only
  // a sizing slot, and inherits its colour from the row.
  return (
    <span
      className={cn(
        'text-foreground/80 inline-flex h-6 w-[38px] shrink-0 items-center justify-center',
        className
      )}
      aria-hidden>
      <Renderer className="h-full w-full" />
    </span>
  );
}

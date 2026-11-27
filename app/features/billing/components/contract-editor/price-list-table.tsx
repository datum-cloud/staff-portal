import { CONTRACT_CURRENCY } from '../../lib/contract';
import {
  isPricedPerContract,
  listFeeRowsFromOffer,
  type ListFeeOption,
} from '../../lib/contract-list-fees';
import { rateSlots, usageRowsFromOffer, type UsageMeterOption } from '../../lib/contract-usage';
import { formatMoney, getOfferDisplayName, indexServicesByRef } from '../../utils';
import { periodUnitText, rateSlotText } from '../contract-fee-text';
import { PricingInfo } from '../pricing-info';
import { FeeSupplyDate, useFeeItemOptions } from './fee-supply-date';
import type { ContractFormValues, ListFeeRowValues, UsageRowValues } from './schema';
import { WholeNumberInput } from './whole-number-input';
import { EMBEDDED_TABLE_HEADER_CELL_CLASS } from '@/features/milo';
import { HEADER_STACK_H } from '@/features/milo/lib/dimensions';
import {
  useBillingDefaultOfferQuery,
  useOfferDetailQuery,
  useServiceListQuery,
} from '@/resources/request/client';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { UseFormReturn } from 'react-hook-form';

/**
 * The header's cells, stuck below the page's navbar and breadcrumb bar
 * (--price-list-top) and opaque, so rows scrolling under them don't show
 * through.
 */
const STICKY_HEADER_CELL_CLASS = cn(
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  'top-(--price-list-top) bg-table-surface-subtle'
);

/** The table's columns: the item, then its quantity, discount and customer price. */
const COLUMNS = 4;

type PriceListEntry =
  | { kind: 'usage'; option: UsageMeterOption; index: number }
  | { kind: 'fee'; option: ListFeeOption; index: number };

/**
 * The platform's price list, by service: each meter's usage pricing and each
 * list fee. Staff tick what the contract bills, with a quantity for fees and
 * an optional discount. A customer price, left empty for the list price,
 * becomes the customer's own pricing based on the list one, so the list
 * price stays beside it.
 *
 * Each row shows its pricing's description, and its notes for staff. A
 * ticked one-time fee has item options with a supply date, as the
 * contract's own one-time fees do.
 *
 * Staff can search it by name or service, and collapse a service. Rows that
 * are filtered out or collapsed are only hidden, so what's ticked and typed
 * in them is kept and still saved.
 */
export function PriceListTable({
  usageOptions,
  feeOptions,
  contractStartsAt,
}: {
  usageOptions: UsageMeterOption[];
  feeOptions: ListFeeOption[];
  /** The contract's start, for a change to one, where a supply date starts. */
  contractStartsAt?: Date;
}) {
  const servicesQuery = useServiceListQuery();
  const servicesByRef = useMemo(
    () => indexServicesByRef(servicesQuery.data?.items ?? []),
    [servicesQuery.data?.items]
  );
  const groups = useMemo(() => {
    const byService = new Map<string, PriceListEntry[]>();
    const add = (serviceRef: string, entry: PriceListEntry) =>
      byService.set(serviceRef, [...(byService.get(serviceRef) ?? []), entry]);
    feeOptions.forEach((option, index) => add(option.serviceRef, { kind: 'fee', option, index }));
    usageOptions.forEach((option, index) =>
      add(option.serviceRef, { kind: 'usage', option, index })
    );
    // Fees that aren't for a service go last.
    return [...byService.entries()].sort(
      ([a], [b]) => Number(a === '') - Number(b === '') || a.localeCompare(b)
    );
  }, [usageOptions, feeOptions]);

  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const usageRows = (Form.useWatch('usage') as UsageRowValues[] | undefined) ?? [];
  const feeRows = (Form.useWatch('listFees') as ListFeeRowValues[] | undefined) ?? [];

  if (groups.length === 0) {
    return (
      <Text size="sm" textColor="muted">
        <Trans>
          The platform has no list prices yet, so the contract bills only the fees above.
        </Trans>
      </Text>
    );
  }

  // Search matches a row's name or its service's; while searching, every
  // service with a match is shown open.
  const query = search.trim().toLowerCase();
  const shown = groups.map(([serviceRef, entries]) => {
    const title = serviceRef
      ? servicesByRef.get(serviceRef)?.spec?.displayName || serviceRef
      : t`Not for a service`;
    const groupMatches = query !== '' && title.toLowerCase().includes(query);
    const visible = new Set(
      entries.filter(
        (entry) =>
          !query ||
          groupMatches ||
          entry.option.label.toLowerCase().includes(query) ||
          (entry.kind === 'fee' && entry.option.sku.toLowerCase().includes(query))
      )
    );
    const key = serviceRef || 'none';
    const ticked = entries.filter((entry) =>
      entry.kind === 'fee' ? feeRows[entry.index]?.selected : usageRows[entry.index]?.selected
    ).length;
    return {
      key,
      title,
      entries,
      visible,
      ticked,
      open: query !== '' || !collapsed.has(key),
    };
  });
  const anyVisible = shown.some((group) => group.visible.size > 0);
  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // Tick all acts on the rows on screen.
  const onScreen = shown.flatMap((group) =>
    group.open ? group.entries.filter((entry) => group.visible.has(entry)) : []
  );

  return (
    <div className="flex flex-col gap-2">
      <IncludeDefaultOffer usageOptions={usageOptions} feeOptions={feeOptions} />
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t`Search the price list`}
        aria-label={t`Search the price list`}
        className="h-9 w-full sm:w-64"
      />
      {/*
        The header sticks below the navbar and breadcrumb bar as the page
        scrolls, so nothing between it and the page may scroll or clip: a
        plain table rather than datum-ui's, which wraps it in a scroller, and
        a frame that only scrolls sideways on a narrow screen, where the
        table is wider than it.
      */}
      <div
        className="dark:border-border border-table-line overflow-x-auto rounded-sm border md:overflow-visible"
        style={{ '--price-list-top': `${HEADER_STACK_H}px` } as CSSProperties}>
        <table className="w-full min-w-xl table-fixed caption-bottom text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(STICKY_HEADER_CELL_CLASS, 'rounded-tl-sm')}>
                <SelectAll entries={onScreen} />
              </TableHead>
              <TableHead className={cn(STICKY_HEADER_CELL_CLASS, 'w-20')}>
                <Trans>Qty</Trans>
              </TableHead>
              <TableHead className={cn(STICKY_HEADER_CELL_CLASS, 'w-20')}>
                <Trans>% off</Trans>
              </TableHead>
              <TableHead className={cn(STICKY_HEADER_CELL_CLASS, 'w-40 rounded-tr-sm')}>
                <Trans>Customer price</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/*
              Rows filtered out or collapsed stay mounted, so they keep what's
              ticked and typed, but come first: the body drops the border of
              its last row, which must be one on screen, or it doubles up with
              the frame's.
            */}
            {shown.flatMap((group) =>
              group.entries
                .filter((entry) => !group.open || !group.visible.has(entry))
                .map((entry) => (
                  <PriceListRow
                    key={entryKey(entry)}
                    entry={entry}
                    hidden
                    contractStartsAt={contractStartsAt}
                  />
                ))
            )}
            {shown.map((group) => (
              <ServiceGroup
                key={group.key}
                title={group.title}
                entries={group.entries}
                visible={group.visible}
                ticked={group.ticked}
                open={group.open}
                contractStartsAt={contractStartsAt}
                // A search shows every matching service open.
                onToggle={query ? undefined : () => toggle(group.key)}
              />
            ))}
            {!anyVisible ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMNS} className="py-6 text-center">
                  <Text size="sm" textColor="muted">
                    <Trans>Nothing on the price list matches “{search.trim()}”.</Trans>
                  </Text>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

/**
 * Ticks, or unticks, everything the platform's default offer bills that's
 * on the price list, at the offer's pricing versions. The offer's discounts
 * aren't copied: the contract sets its own. Rows already ticked are left as
 * they are, so a customer price typed in one is kept. Shown only when the
 * default offer bills something on the price list.
 */
function IncludeDefaultOffer({
  usageOptions,
  feeOptions,
}: {
  usageOptions: UsageMeterOption[];
  feeOptions: ListFeeOption[];
}) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const usage = (Form.useWatch('usage') as UsageRowValues[] | undefined) ?? [];
  const listFees = (Form.useWatch('listFees') as ListFeeRowValues[] | undefined) ?? [];
  const defaultOfferQuery = useBillingDefaultOfferQuery();
  const offerQuery = useOfferDetailQuery(defaultOfferQuery.data ?? '');
  const offer = offerQuery.data;
  const included = useMemo(
    () => ({
      usage: usageRowsFromOffer(usageOptions, offer)
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.selected),
      fees: listFeeRowsFromOffer(feeOptions, offer)
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.selected),
    }),
    [usageOptions, feeOptions, offer]
  );
  const total = included.usage.length + included.fees.length;
  if (!offer || total === 0) return null;

  const ticked =
    included.usage.filter(({ index }) => usage[index]?.selected).length +
    included.fees.filter(({ index }) => listFees[index]?.selected).length;
  const checked = ticked === 0 ? false : ticked === total ? true : ('indeterminate' as const);
  const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted };
  const include = () => {
    included.usage.forEach(({ row, index }) => {
      if (usage[index]?.selected) return;
      form.setValue(`usage.${index}.pricingName`, row.pricingName, options);
      form.setValue(`usage.${index}.selected`, true, options);
    });
    included.fees.forEach(({ row, index }) => {
      if (listFees[index]?.selected) return;
      form.setValue(`listFees.${index}.quantity`, row.quantity, options);
      form.setValue(`listFees.${index}.selected`, true, options);
    });
  };
  const exclude = () => {
    included.usage.forEach(({ index }) => form.setValue(`usage.${index}.selected`, false, options));
    included.fees.forEach(({ index }) =>
      form.setValue(`listFees.${index}.selected`, false, options)
    );
  };
  const name = getOfferDisplayName(offer);
  return (
    <label className="hover:bg-muted/40 flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5">
      <Checkbox
        checked={checked}
        onCheckedChange={() => (checked === true ? exclude() : include())}
        className="mt-0.5"
      />
      <span className="flex flex-col gap-0.5">
        <Text size="sm" weight="medium">
          <Trans>Include everything in the default offer, {name}</Trans>
        </Text>
        <Text size="xs" textColor="muted">
          <Plural
            value={total}
            one="Ticks its # price, at list price. Its discounts aren't copied."
            other="Ticks its # prices, at list price. Its discounts aren't copied."
          />
          {checked === 'indeterminate' ? (
            <>
              {' '}
              <Trans>
                {ticked} of {total} ticked.
              </Trans>
            </>
          ) : null}
        </Text>
      </span>
    </label>
  );
}

/** Ticks or unticks every row of the price list on screen. */
function SelectAll({ entries }: { entries: PriceListEntry[] }) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const usage = (Form.useWatch('usage') as UsageRowValues[] | undefined) ?? [];
  const listFees = (Form.useWatch('listFees') as ListFeeRowValues[] | undefined) ?? [];
  const isTicked = (entry: PriceListEntry) =>
    Boolean(entry.kind === 'fee' ? listFees[entry.index]?.selected : usage[entry.index]?.selected);
  const ticked = entries.filter(isTicked).length;
  const checked =
    ticked === 0 ? false : ticked === entries.length ? true : ('indeterminate' as const);
  const setAll = (selected: boolean) => {
    const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted };
    entries.forEach((entry) =>
      entry.kind === 'fee'
        ? form.setValue(`listFees.${entry.index}.selected`, selected, options)
        : form.setValue(`usage.${entry.index}.selected`, selected, options)
    );
  };
  // The title sits outside the checkbox, so clicking it doesn't tick every row.
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={() => setAll(checked !== true)}
        aria-label={checked === true ? t`Untick all` : t`Tick all`}
      />
      <span>
        <Trans>Item</Trans>
      </span>
    </div>
  );
}

function ServiceGroup({
  title,
  entries,
  visible,
  ticked,
  open,
  onToggle,
  contractStartsAt,
}: {
  title: string;
  entries: PriceListEntry[];
  /** The entries a search leaves. */
  visible: Set<PriceListEntry>;
  /** How many of the service's rows are ticked, shown while it's collapsed. */
  ticked: number;
  open: boolean;
  /** Collapses or opens the service; unset while searching. */
  onToggle?: () => void;
  contractStartsAt?: Date;
}) {
  // Its hidden rows are rendered at the top of the table (see PriceListTable).
  if (visible.size === 0) return null;
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={COLUMNS} className="py-1.5">
          {onToggle ? (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 text-left"
              aria-expanded={open}
              onClick={onToggle}>
              <Icon
                icon={open ? ChevronDown : ChevronRight}
                size={14}
                className="text-muted-foreground"
              />
              <Text size="xs" weight="medium" textColor="muted">
                {title}
              </Text>
              <Text size="xs" textColor="muted">
                {' · '}
                <Trans>
                  {ticked} of {entries.length} ticked
                </Trans>
              </Text>
            </button>
          ) : (
            <Text size="xs" weight="medium" textColor="muted">
              {title}
            </Text>
          )}
        </TableCell>
      </TableRow>
      {open
        ? entries
            .filter((entry) => visible.has(entry))
            .map((entry) => (
              <PriceListRow
                key={entryKey(entry)}
                entry={entry}
                hidden={false}
                contractStartsAt={contractStartsAt}
              />
            ))
        : null}
    </>
  );
}

const entryKey = (entry: PriceListEntry) =>
  entry.kind === 'fee' ? `fee-${entry.option.name}` : `usage-${entry.option.metric}`;

function PriceListRow({
  entry,
  hidden,
  contractStartsAt,
}: {
  entry: PriceListEntry;
  hidden: boolean;
  contractStartsAt?: Date;
}) {
  return entry.kind === 'fee' ? (
    <ListFeeRows
      option={entry.option}
      index={entry.index}
      hidden={hidden}
      contractStartsAt={contractStartsAt}
    />
  ) : (
    <UsageRows option={entry.option} index={entry.index} hidden={hidden} />
  );
}

/**
 * A list fee's name, with its SKU beside it as a small tag. The SKU is for
 * staff only and never goes on an invoice.
 */
function ItemName({
  name,
  label,
  sku,
}: {
  /** The ticking field's name. */
  name: string;
  label: string;
  sku?: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <Form.Field name={name} className="space-y-0">
        <Form.Checkbox label={label} />
      </Form.Field>
      {sku ? (
        <Text
          as="span"
          size="2xs"
          textColor="muted"
          className="rounded border px-1 font-mono"
          title={t`SKU, for staff only`}>
          {sku}
        </Text>
      ) : null}
    </div>
  );
}

/** How often a list fee charges, as a word: "one-time", "monthly", "quarterly" or "annual". */
const feeCadenceText = (option: ListFeeOption) => {
  if (option.chargeType === 'OneTime') return t`one-time`;
  switch (option.interval) {
    case 'quarterly':
      return t`quarterly`;
    case 'annual':
      return t`annual`;
    default:
      return t`monthly`;
  }
};

/**
 * A list fee's price and how often it charges, under its name, e.g.
 * "$300.00 per port · monthly", or "Priced per contract · one-time, per
 * project" for one whose amount is set on each order form.
 */
const feePriceText = (option: ListFeeOption) => {
  const cadence = feeCadenceText(option);
  const unit = option.pricingUnit;
  if (isPricedPerContract(option)) {
    return unit
      ? t`Priced per contract · ${cadence}, per ${unit}`
      : t`Priced per contract · ${cadence}`;
  }
  const amount = formatMoney(Number.parseFloat(option.amount), CONTRACT_CURRENCY);
  return unit ? t`${amount} per ${unit} · ${cadence}` : t`${amount} · ${cadence}`;
};

/** What an unticked row's customer price would be: the list price, or none yet. */
function UntickedPrice({ perContract = false }: { perContract?: boolean }) {
  return (
    <Text size="sm" textColor="muted">
      {perContract ? <Trans>Priced per contract</Trans> : <Trans>List price</Trans>}
    </Text>
  );
}

function ListFeeRows({
  option,
  index,
  hidden,
  contractStartsAt,
}: {
  option: ListFeeOption;
  index: number;
  hidden: boolean;
  contractStartsAt?: Date;
}) {
  const row = Form.useWatch(`listFees.${index}`) as ListFeeRowValues | undefined;
  const selected = Boolean(row?.selected);
  const prefix = `listFees.${index}.`;
  const options = useFeeItemOptions(prefix);
  const perContract = isPricedPerContract(option);
  // A ticked one-time fee has item options: its supply date.
  const hasOptions = selected && option.chargeType === 'OneTime';
  // Unticked rows show no inputs. They stay mounted, hidden, so what was
  // typed in them is kept if the row is ticked again.
  const whenTicked = cn(!selected && 'hidden');
  return (
    <>
      <TableRow className={cn(hidden && 'hidden', hasOptions && options.open && 'border-b-0')}>
        <TableCell className="align-top whitespace-normal">
          <div className="flex flex-col gap-1">
            <ItemName name={`${prefix}selected`} label={option.label} sku={option.sku} />
            <Text size="xs" textColor="muted" className="pl-6">
              {feePriceText(option)}
            </Text>
            <PricingInfo
              description={option.description}
              notes={option.notes}
              clamp
              className="max-w-md pl-6"
            />
            {option.chargeType === 'Recurring' ? (
              // When the contract invoices it, and for how long: its terms,
              // not the list fee's. Empty renewals for no end.
              <Text
                as="div"
                size="sm"
                textColor="muted"
                className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 pl-6', whenTicked)}>
                <Trans>Billed</Trans>
                {/* space-y-0: Form.Field spaces its children, and a Select is
                    followed by its hidden native select. */}
                <Form.Field name={`${prefix}billingTiming`} className="w-32 space-y-0">
                  <Form.Select aria-label={t`Billed`}>
                    <Form.SelectItem value="InArrears">
                      <Trans>In arrears</Trans>
                    </Form.SelectItem>
                    <Form.SelectItem value="InAdvance">
                      <Trans>In advance</Trans>
                    </Form.SelectItem>
                  </Form.Select>
                </Form.Field>
                <Trans>for</Trans>
                <Form.Field name={`${prefix}periods`} className="space-y-0">
                  <WholeNumberInput
                    placeholder={t`No end`}
                    aria-label={t`Renewals`}
                    className="w-20"
                  />
                </Form.Field>
                {periodUnitText(option.interval)}
              </Text>
            ) : null}
            {hasOptions ? (
              <button
                type="button"
                className="flex items-center gap-1 pl-6 text-left text-xs font-medium"
                aria-expanded={options.open}
                onClick={options.toggle}>
                <Icon icon={options.open ? ChevronDown : ChevronRight} size={12} />
                <Trans>Item options</Trans>
                {!options.open && options.summary ? (
                  <Text as="span" size="xs" textColor="muted" className="font-normal">
                    · {options.summary}
                  </Text>
                ) : null}
              </button>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="align-top">
          <Form.Field name={`${prefix}quantity`} className={whenTicked}>
            <WholeNumberInput placeholder="1" aria-label={t`Quantity`} />
          </Form.Field>
        </TableCell>
        <TableCell className="align-top">
          <Form.Field name={`${prefix}discount`} className={whenTicked}>
            <WholeNumberInput placeholder="0" aria-label={t`Discount`} />
          </Form.Field>
        </TableCell>
        <TableCell className="align-top">
          <Form.Field name={`${prefix}amount`} className={whenTicked}>
            <Form.Input
              inputMode="decimal"
              placeholder={perContract ? t`Enter a price` : option.amount}
              aria-label={t`Customer amount`}
            />
          </Form.Field>
          {selected ? null : <UntickedPrice perContract={perContract} />}
        </TableCell>
      </TableRow>
      {hasOptions && options.open ? (
        <TableRow className={cn('hover:bg-transparent', hidden && 'hidden')}>
          <TableCell colSpan={COLUMNS} className="pt-0 pb-3 pl-9">
            <div className="max-w-md">
              <FeeSupplyDate prefix={prefix} contractStartsAt={contractStartsAt} />
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function UsageRows({
  option,
  index,
  hidden,
}: {
  option: UsageMeterOption;
  index: number;
  hidden: boolean;
}) {
  const row = Form.useWatch(`usage.${index}`) as UsageRowValues | undefined;
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const selected = Boolean(row?.selected);
  const list = option.pricings.find((p) => p.metadata?.name === row?.pricingName);
  const slots = rateSlots(list?.spec);
  const unit = option.pricingUnit;
  const hasCustomRates = (row?.amounts ?? []).some((amount) => amount.trim() !== '');
  const [expanded, setExpanded] = useState(hasCustomRates);
  const whenTicked = cn(!selected && 'hidden');

  // Rates typed against one list pricing don't carry over to another, which
  // may price the meter differently or in more or fewer rates: picking a
  // different version starts the customer's rates again, at the list rates.
  const pricingName = row?.pricingName;
  const shownPricing = useRef(pricingName);
  useEffect(() => {
    if (!row || shownPricing.current === pricingName) return;
    const previous = shownPricing.current;
    shownPricing.current = pricingName;
    // The row's first value is what the form started with, not a change.
    if (previous === undefined) return;
    form.setValue(
      `usage.${index}.amounts`,
      slots.map(() => ''),
      { shouldDirty: true }
    );
    // Only when the pricing changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingName]);

  const single = slots.length === 1;
  return (
    <>
      <TableRow className={cn(hidden && 'hidden')}>
        <TableCell className="align-top whitespace-normal">
          <div className="flex flex-col gap-1">
            <ItemName name={`usage.${index}.selected`} label={option.label} />
            {/* Usage is always invoiced at the end of the period. */}
            <Text size="xs" textColor="muted" className="pl-6">
              {single ? (
                <span className="tabular-nums">{t`$${slots[0].listAmount} per ${unit}`}</span>
              ) : (
                <button
                  type="button"
                  className="text-foreground -ml-0.5 inline-flex items-center gap-0.5 align-bottom font-medium"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((open) => !open)}>
                  <Icon icon={expanded ? ChevronDown : ChevronRight} size={12} />
                  {t`${slots.length} rates per ${unit}`}
                </button>
              )}
              <span>
                {' · '}
                <Trans>usage, billed in arrears</Trans>
              </span>
            </Text>
            <PricingInfo
              description={list?.spec?.description}
              notes={list?.spec?.notes}
              clamp
              className="max-w-md pl-6"
            />
            {option.pricings.length > 1 ? (
              <Form.Field name={`usage.${index}.pricingName`} className="w-56 space-y-0 pl-6">
                <Form.Select disabled={!selected}>
                  {option.pricings.map((pricing, i) => {
                    const name = pricing.metadata?.name ?? '';
                    return (
                      <Form.SelectItem key={name} value={name}>
                        {name}
                        {i === 0 ? t` · newest` : ''}
                      </Form.SelectItem>
                    );
                  })}
                </Form.Select>
              </Form.Field>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="align-top">
          {selected ? (
            <Text size="sm" textColor="muted" className="flex h-9 items-center">
              <Trans>Usage</Trans>
            </Text>
          ) : null}
        </TableCell>
        <TableCell className="align-top">
          <Form.Field name={`usage.${index}.discount`} className={whenTicked}>
            <WholeNumberInput placeholder="0" aria-label={t`Discount`} />
          </Form.Field>
        </TableCell>
        <TableCell className="align-top">
          {single ? (
            <Form.Field name={`usage.${index}.amounts.0`} className={whenTicked}>
              <Form.Input
                inputMode="decimal"
                placeholder={slots[0].listAmount}
                aria-label={t`Customer rate`}
              />
            </Form.Field>
          ) : selected && !expanded ? (
            <Text size="sm" textColor="muted" className="flex h-9 items-center">
              {hasCustomRates ? <Trans>Customer rates</Trans> : <Trans>List rates</Trans>}
            </Text>
          ) : null}
          {selected ? null : <UntickedPrice />}
        </TableCell>
      </TableRow>
      {!single && expanded
        ? slots.map((slot, slotIndex) => (
            <TableRow
              key={`${row?.pricingName}-${slotIndex}`}
              className={cn('hover:bg-transparent', hidden && 'hidden')}>
              <TableCell colSpan={COLUMNS - 1} className="pl-12 whitespace-normal">
                <Text size="xs" textColor="muted">
                  {rateSlotText(slot.label)}
                  {' · '}
                  <span className="text-foreground tabular-nums">{`$${slot.listAmount}`}</span>
                </Text>
              </TableCell>
              <TableCell>
                <Form.Field name={`usage.${index}.amounts.${slotIndex}`}>
                  <Form.Input
                    inputMode="decimal"
                    placeholder={slot.listAmount}
                    aria-label={t`Customer rate, ${rateSlotText(slot.label)}`}
                    disabled={!selected}
                  />
                </Form.Field>
              </TableCell>
            </TableRow>
          ))
        : null}
    </>
  );
}

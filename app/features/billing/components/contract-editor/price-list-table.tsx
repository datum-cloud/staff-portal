import type { ListFeeOption } from '../../lib/contract-list-fees';
import { rateSlots, type UsageMeterOption } from '../../lib/contract-usage';
import { formatMoney, indexServicesByRef } from '../../utils';
import {
  CONTRACT_CURRENCY,
  type ContractFormValues,
  type ListFeeRowValues,
  type UsageRowValues,
} from './schema';
import { WholeNumberInput } from './whole-number-input';
import { useServiceListQuery } from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

type PriceListEntry =
  | { kind: 'usage'; option: UsageMeterOption; index: number }
  | { kind: 'fee'; option: ListFeeOption; index: number };

/**
 * The platform's price list, by service: each meter's usage pricing and each
 * list fee. Staff tick what the contract bills, with a quantity for fees and
 * an optional discount. A customer price, left empty for the list price,
 * becomes the customer's own pricing based on the list one, so the list
 * price stays beside it.
 */
export function PriceListTable({
  usageOptions,
  feeOptions,
}: {
  usageOptions: UsageMeterOption[];
  feeOptions: ListFeeOption[];
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

  if (groups.length === 0) {
    return (
      <Text size="sm" textColor="muted">
        <Trans>The platform&apos;s price list is empty.</Trans>
      </Text>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[40rem]">
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead>
              <SelectAll />
            </TableHead>
            <TableHead className="w-44">
              <Trans>List price</Trans>
            </TableHead>
            <TableHead className="w-20">
              <Trans>Qty</Trans>
            </TableHead>
            <TableHead className="w-20">
              <Trans>% off</Trans>
            </TableHead>
            <TableHead className="w-36">
              <Trans>Customer price</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(([serviceRef, entries]) => (
            <ServiceGroup
              key={serviceRef || 'none'}
              title={
                serviceRef
                  ? servicesByRef.get(serviceRef)?.spec?.displayName || serviceRef
                  : t`Not for a service`
              }
              entries={entries}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Ticks or unticks every row of the price list. */
function SelectAll() {
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const usage = (Form.useWatch('usage') as UsageRowValues[] | undefined) ?? [];
  const listFees = (Form.useWatch('listFees') as ListFeeRowValues[] | undefined) ?? [];
  const rows = [...usage, ...listFees];
  const ticked = rows.filter((row) => row.selected).length;
  const checked = ticked === 0 ? false : ticked === rows.length ? true : 'indeterminate';
  const setAll = (selected: boolean) => {
    const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted };
    usage.forEach((_, i) => form.setValue(`usage.${i}.selected`, selected, options));
    listFees.forEach((_, i) => form.setValue(`listFees.${i}.selected`, selected, options));
  };
  return (
    <label className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={() => setAll(checked !== true)}
        aria-label={checked === true ? t`Untick all` : t`Tick all`}
      />
      <Trans>Pricing</Trans>
    </label>
  );
}

function ServiceGroup({ title, entries }: { title: string; entries: PriceListEntry[] }) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={5} className="py-1.5">
          <Text size="xs" weight="medium" textColor="muted">
            {title}
          </Text>
        </TableCell>
      </TableRow>
      {entries.map((entry) =>
        entry.kind === 'fee' ? (
          <ListFeeRows key={`fee-${entry.option.name}`} option={entry.option} index={entry.index} />
        ) : (
          <UsageRows
            key={`usage-${entry.option.metric}`}
            option={entry.option}
            index={entry.index}
          />
        )
      )}
    </>
  );
}

/** A list fee's price, e.g. "$300.00 / month per port". */
const feePriceText = (option: ListFeeOption) => {
  const amount = formatMoney(Number.parseFloat(option.amount), CONTRACT_CURRENCY);
  const price = option.chargeType === 'OneTime' ? t`${amount} once` : t`${amount} / month`;
  return option.pricingUnit ? t`${price} per ${option.pricingUnit}` : price;
};

function ListFeeRows({ option, index }: { option: ListFeeOption; index: number }) {
  const row = Form.useWatch(`listFees.${index}`) as ListFeeRowValues | undefined;
  const selected = Boolean(row?.selected);
  return (
    <TableRow>
      <TableCell className="align-middle">
        <Form.Field name={`listFees.${index}.selected`}>
          <Form.Checkbox label={option.label} />
        </Form.Field>
      </TableCell>
      <TableCell className="align-middle">
        <Text size="sm" className="tabular-nums">
          {feePriceText(option)}
        </Text>
      </TableCell>
      <TableCell className="align-middle">
        <Form.Field name={`listFees.${index}.quantity`}>
          <WholeNumberInput placeholder="1" aria-label={t`Quantity`} disabled={!selected} />
        </Form.Field>
      </TableCell>
      <TableCell className="align-middle">
        <Form.Field name={`listFees.${index}.discount`}>
          <WholeNumberInput placeholder="0" aria-label={t`Discount`} disabled={!selected} />
        </Form.Field>
      </TableCell>
      <TableCell className="align-middle">
        <Form.Field name={`listFees.${index}.amount`}>
          <Form.Input
            inputMode="decimal"
            placeholder={option.amount}
            aria-label={t`Customer amount`}
            disabled={!selected}
          />
        </Form.Field>
      </TableCell>
    </TableRow>
  );
}

function UsageRows({ option, index }: { option: UsageMeterOption; index: number }) {
  const row = Form.useWatch(`usage.${index}`) as UsageRowValues | undefined;
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const selected = Boolean(row?.selected);
  const list = option.pricings.find((p) => p.metadata?.name === row?.pricingName);
  const slots = rateSlots(list?.spec);
  const unit = option.pricingUnit;
  const hasCustomRates = (row?.amounts ?? []).some((amount) => amount.trim() !== '');
  const [expanded, setExpanded] = useState(hasCustomRates);

  // A different list pricing may price the meter in more or fewer rates, so
  // the customer's rates start again, at the list rates.
  const pricingName = row?.pricingName;
  const slotCount = slots.length;
  useEffect(() => {
    if (!row || row.amounts.length === slotCount) return;
    form.setValue(
      `usage.${index}.amounts`,
      slots.map(() => ''),
      { shouldDirty: true }
    );
    // Only when the pricing changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingName, slotCount]);

  const single = slots.length === 1;
  return (
    <>
      <TableRow>
        <TableCell className="align-middle">
          <div className="flex flex-col gap-1">
            <Form.Field name={`usage.${index}.selected`}>
              <Form.Checkbox label={option.label} />
            </Form.Field>
            {option.pricings.length > 1 ? (
              <Form.Field name={`usage.${index}.pricingName`} className="w-56 pl-6">
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
        <TableCell className="align-middle">
          {single ? (
            <Text size="sm" className="tabular-nums">
              {t`$${slots[0].listAmount} per ${unit}`}
            </Text>
          ) : (
            <Button
              type="quaternary"
              theme="borderless"
              size="small"
              htmlType="button"
              className="-ml-2 h-auto px-2 py-1"
              icon={<Icon icon={expanded ? ChevronDown : ChevronRight} size={14} />}
              onClick={() => setExpanded((open) => !open)}>
              {t`${slots.length} rates per ${unit}`}
            </Button>
          )}
        </TableCell>
        <TableCell className="align-middle">
          <Text size="sm" textColor="muted">
            <Trans>Usage</Trans>
          </Text>
        </TableCell>
        <TableCell className="align-middle">
          <Form.Field name={`usage.${index}.discount`}>
            <WholeNumberInput placeholder="0" aria-label={t`Discount`} disabled={!selected} />
          </Form.Field>
        </TableCell>
        <TableCell className="align-middle">
          {single ? (
            <Form.Field name={`usage.${index}.amounts.0`}>
              <Form.Input
                inputMode="decimal"
                placeholder={slots[0].listAmount}
                aria-label={t`Customer rate`}
                disabled={!selected}
              />
            </Form.Field>
          ) : !expanded && hasCustomRates ? (
            <Text size="sm">
              <Trans>Customer rates</Trans>
            </Text>
          ) : null}
        </TableCell>
      </TableRow>
      {!single && expanded
        ? slots.map((slot, slotIndex) => (
            <TableRow key={`${row?.pricingName}-${slotIndex}`} className="hover:bg-transparent">
              <TableCell className="pl-12">
                <Text size="xs" textColor="muted">
                  {slot.label}
                </Text>
              </TableCell>
              <TableCell>
                <Text size="xs" className="tabular-nums">
                  {`$${slot.listAmount}`}
                </Text>
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell>
                <Form.Field name={`usage.${index}.amounts.${slotIndex}`}>
                  <Form.Input
                    inputMode="decimal"
                    placeholder={slot.listAmount}
                    aria-label={t`Customer rate, ${slot.label}`}
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

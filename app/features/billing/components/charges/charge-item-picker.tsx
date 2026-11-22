import {
  CATALOG_ITEM_PREFIX,
  catalogPricingName,
  pricingUnitAmount,
  type ChargeFormValues,
  type ChargeItemOptions,
} from '../../lib/charges';
import type { ListFeeOption } from '../../lib/contract-list-fees';
import { formatMoney } from '../../utils';
import { feeChargeText } from '../contract-fee-text';
import { Autocomplete, type AutocompleteGroup } from '@datum-cloud/datum-ui/autocomplete';
import { Form } from '@datum-cloud/datum-ui/form';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

interface ItemOption {
  value: string;
  label: string;
  fee: ListFeeOption;
}

/** A catalog item's price, e.g. "$300.00 once per port" or "$50.00 / month". */
const itemPriceText = (fee: ListFeeOption) => {
  const price = feeChargeText(formatMoney(Number.parseFloat(fee.amount), 'USD'), fee);
  return fee.pricingUnit ? t`${price} per ${fee.pricingUnit}` : price;
};

const matches = (fee: ListFeeOption, query: string) =>
  [fee.label, fee.name, fee.sku, fee.tax?.code ?? ''].some((text) =>
    text.toLowerCase().includes(query)
  );

const toOption = (fee: ListFeeOption): ItemOption => ({
  value: `${CATALOG_ITEM_PREFIX}${fee.name}`,
  label: fee.label,
  fee,
});

/**
 * The item a charge is for: one search box over the account's contract
 * prices and the catalog's one-time and recurring pricings, by name, SKU or
 * tax code. A name that isn't in the catalog can be added as a custom item.
 *
 * Picking a catalog item fills in its description, price and tax, which
 * staff can still change. The SKU shows here, for staff, and never on the
 * invoice. Render it inside the item's Form.Field.
 */
export function ChargeItemPicker({
  options,
  accountPricesLabel,
  onCatalogTax,
}: {
  options: ChargeItemOptions;
  /** The heading over the account's own contract prices. */
  accountPricesLabel: string;
  /** Called when a catalog item brings a tax code or isn't taxable, to show the item options. */
  onCatalogTax: () => void;
}) {
  const { id, fieldState } = Form.useFieldContext();
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const [search, setSearch] = useState('');
  const value = (fieldState?.value as string | undefined) ?? '';

  const feeByName = useMemo(
    () => new Map([...options.accountPrices, ...options.catalog].map((fee) => [fee.name, fee])),
    [options]
  );
  const groups = useMemo((): AutocompleteGroup<ItemOption>[] => {
    const query = search.trim().toLowerCase();
    const keep = (fees: ListFeeOption[]) =>
      (query ? fees.filter((fee) => matches(fee, query)) : fees).map(toOption);
    return [
      { label: accountPricesLabel, options: keep(options.accountPrices) },
      { label: t`Catalog`, options: keep(options.catalog) },
    ].filter((group) => group.options.length > 0);
  }, [options, search, accountPricesLabel]);

  const choose = (next: string) => {
    const previous = value;
    fieldState?.change(next);
    fieldState?.blur();
    const set = <K extends keyof ChargeFormValues>(name: K, fieldValue: ChargeFormValues[K]) =>
      form.setValue(name, fieldValue as never, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      });
    const pricingName = catalogPricingName(next);
    const fee = pricingName ? feeByName.get(pricingName) : undefined;
    if (fee) {
      const notTaxable = fee.tax?.taxable === false;
      set('description', fee.label);
      set('unitAmount', pricingUnitAmount(fee.amount));
      set('taxCode', notTaxable ? '' : (fee.tax?.code ?? ''));
      set('notTaxable', notTaxable);
      if (fee.tax?.code || notTaxable) onCatalogTax();
      return;
    }
    set('description', next);
    // A custom item has no list price or tax of its own: clear what a
    // catalog item picked before filled in.
    if (catalogPricingName(previous)) {
      set('unitAmount', '');
      set('taxCode', '');
      set('notTaxable', false);
    }
  };

  return (
    <Autocomplete<ItemOption>
      id={id}
      options={groups}
      value={value}
      onValueChange={choose}
      onSearchChange={setSearch}
      creatable
      creatableLabel={(name) => <Trans>Add &ldquo;{name}&rdquo; as a custom item</Trans>}
      placeholder={t`Search the catalog, or type a name`}
      searchPlaceholder={t`Search by name, SKU or tax code`}
      emptyContent={<Trans>Nothing in the catalog matches. Type a name for a custom item.</Trans>}
      modal
      triggerClassName="w-full"
      renderValue={(option) => option.label}
      renderOption={(option) => (
        <div className="flex min-w-0 flex-col">
          <Text size="sm" className="truncate">
            {option.label}
          </Text>
          <Text size="xs" textColor="muted" className="truncate">
            {[
              itemPriceText(option.fee),
              option.fee.sku ? t`SKU ${option.fee.sku}` : null,
              option.fee.tax?.taxable === false
                ? t`not taxable`
                : option.fee.tax?.code
                  ? t`tax ${option.fee.tax.code}`
                  : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </div>
      )}
    />
  );
}

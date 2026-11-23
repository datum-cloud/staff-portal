import { isoDay } from '../../lib/charges';
import { contractStartFromDate, startOfUtcDay } from '../../lib/contract';
import { supplyDateText } from '../contract-fee-text';
import { ItemOptions, SupplyDateField } from '../item-options';
import { Form } from '@datum-cloud/datum-ui/form';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { useFormState, type FieldValues, type UseFormReturn } from 'react-hook-form';

/**
 * A one-time contract fee's supply date, such as the day of an install,
 * which billing puts on the fee's invoice line as its period. It's a term
 * of the contract, on the Offer's reference. Unset, the period is the day
 * the fee is charged: when the contract starts.
 */

/** The day a one-time fee is charged, as its supply date starts out: the contract's start. */
const defaultSupplyDate = (picked: Date | undefined, contractStartsAt: Date | undefined) => {
  const start = picked ? contractStartFromDate(picked) : (contractStartsAt ?? new Date());
  const day = isoDay(startOfUtcDay(start));
  return { start: day, end: day };
};

/**
 * A one-time fee row's supply date fields, under `prefix` (such as
 * "fees.0."). Ticked with no dates yet, they start on the contract's
 * start: the one picked, else `contractStartsAt`, else today.
 */
export function FeeSupplyDate({
  prefix,
  contractStartsAt,
}: {
  prefix: string;
  contractStartsAt?: Date;
}) {
  const picked = Form.useWatch('startsAt') as Date | undefined;
  return (
    <SupplyDateField
      prefix={prefix}
      defaultPeriod={() => defaultSupplyDate(picked, contractStartsAt)}
      unsetHint={
        <Trans>
          The day it&apos;s charged, when the contract starts. Tick to choose other dates, such as
          the day of an install.
        </Trans>
      }
    />
  );
}

/**
 * Whether a fee row's item options are open, and what they say while
 * they're closed. They start closed, and open when a submit finds a
 * problem with the supply date.
 */
export function useFeeItemOptions(prefix: string) {
  const [opened, setOpened] = useState(false);
  // The submit whose problems staff closed the options on, if any.
  const [closedOnSubmit, setClosedOnSubmit] = useState<number | null>(null);
  const form = Form.useFormContext().form.raw as UseFormReturn<FieldValues>;
  const formState = useFormState({
    control: form.control,
    name: [`${prefix}periodStart`, `${prefix}periodEnd`],
  });
  const hasError = Boolean(
    form.getFieldState(`${prefix}periodStart`, formState).error ||
    form.getFieldState(`${prefix}periodEnd`, formState).error
  );
  const { submitCount } = formState;
  // Open while a submit's problems are in them, until staff close them.
  const open = opened || (hasError && closedOnSubmit !== submitCount);

  const setPeriod = Boolean(Form.useWatch(`${prefix}setPeriod`));
  const start = (Form.useWatch(`${prefix}periodStart`) as string | undefined) ?? '';
  const end = (Form.useWatch(`${prefix}periodEnd`) as string | undefined) ?? '';
  return {
    open,
    toggle: () => {
      if (open) setClosedOnSubmit(submitCount);
      setOpened(!open);
    },
    summary: setPeriod && start ? supplyDateText({ start, end }) : undefined,
  };
}

/** A one-time contract fee's item options: only its supply date, for now. */
export function FeeItemOptions({
  prefix,
  contractStartsAt,
}: {
  prefix: string;
  contractStartsAt?: Date;
}) {
  const { open, toggle, summary } = useFeeItemOptions(prefix);
  return (
    <ItemOptions open={open} onToggle={toggle} summary={summary}>
      <FeeSupplyDate prefix={prefix} contractStartsAt={contractStartsAt} />
    </ItemOptions>
  );
}

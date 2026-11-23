import { isoDayFromLocalDate, localDateFromIsoDay, type ServicePeriod } from '../lib/charges';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { DatePicker } from '@datum-cloud/datum-ui/picker';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ChevronDown, ChevronRight, CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * An item's options, collapsed by default as in Stripe's invoice editor: a
 * charge's tax, discount, supply date and note, or a one-time contract
 * fee's supply date. Its fields stay mounted while it's closed, so what's
 * in them is kept and still validated. `summary` says what's set while
 * it's closed.
 */
export function ItemOptions({
  open,
  onToggle,
  summary,
  className,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  summary?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-md border p-3', className)}>
      <button
        type="button"
        className="flex items-center gap-1.5 text-left text-sm font-medium"
        aria-expanded={open}
        onClick={onToggle}>
        <Icon icon={open ? ChevronDown : ChevronRight} size={14} />
        <Trans>Item options</Trans>
        {!open && summary ? (
          <Text as="span" size="sm" textColor="muted" className="font-normal">
            · {summary}
          </Text>
        ) : null}
      </button>
      <div className={cn('flex flex-col gap-4', !open && 'hidden')}>{children}</div>
    </div>
  );
}

/**
 * An item's supply date: the days the service was supplied, which become
 * its invoice line's period. Unticked, the item keeps its default dates,
 * which `unsetHint` describes; ticked, staff pick a first and last day,
 * filled in from `defaultPeriod` when there are none yet.
 *
 * The fields are `setPeriod`, `periodStart` and `periodEnd` (YYYY-MM-DD,
 * UTC) under `prefix`: '' for the form's own, or a row's path and a dot,
 * such as "fees.0.". `children` show under the dates while they're picked.
 */
export function SupplyDateField({
  prefix = '',
  defaultPeriod,
  unsetHint,
  tooltip,
  children,
}: {
  prefix?: string;
  defaultPeriod: () => ServicePeriod;
  /** The dates the line gets when none are chosen, shown while unticked. */
  unsetHint: ReactNode;
  /** What the supply date is, behind the help icon by its heading. */
  tooltip: string;
  children?: ReactNode;
}) {
  const form = Form.useFormContext().form.raw as UseFormReturn<FieldValues>;
  const setPeriod = Boolean(Form.useWatch(`${prefix}setPeriod`));
  const set = (name: string, value: unknown) =>
    form.setValue(`${prefix}${name}`, value, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Text size="sm" weight="medium">
          <Trans>Supply date</Trans>
        </Text>
        <Tooltip
          message={tooltip}
          side="bottom"
          contentClassName="w-[calc(100vw-2rem)] whitespace-normal break-words sm:w-auto sm:max-w-xs">
          <button
            type="button"
            aria-label={t`What the supply date is`}
            className="text-muted-foreground hover:text-foreground cursor-pointer">
            <Icon icon={CircleHelp} className="size-3.5" />
          </button>
        </Tooltip>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={setPeriod}
          onCheckedChange={(checked) => {
            set('setPeriod', checked === true);
            if (checked === true && !form.getValues(`${prefix}periodStart`)) {
              const period = defaultPeriod();
              set('periodStart', period.start);
              set('periodEnd', period.end);
            }
          }}
        />
        <Trans>Choose the dates</Trans>
      </label>
      {setPeriod ? (
        <>
          <div className="grid grid-cols-2 items-start gap-3">
            <Form.Field name={`${prefix}periodStart`} label={t`From`} required>
              <UtcDayPicker />
            </Form.Field>
            <Form.Field name={`${prefix}periodEnd`} label={t`To`} required>
              <UtcDayPicker minFrom={`${prefix}periodStart`} />
            </Form.Field>
          </div>
          {children}
        </>
      ) : (
        <Text size="sm" textColor="muted">
          {unsetHint}
        </Text>
      )}
    </div>
  );
}

/**
 * A single UTC day for a YYYY-MM-DD field, with the contract editor's
 * date picker. `minFrom` names a field the day can't be before.
 */
export function UtcDayPicker({ minFrom }: { minFrom?: string }) {
  const { id, name, fieldState } = Form.useFieldContext();
  // Without a minimum, it watches its own field rather than none.
  const min = Form.useWatch(minFrom ?? name) as string | undefined;
  const minDate = minFrom ? localDateFromIsoDay(min) : null;
  return (
    <DatePicker
      id={id}
      value={localDateFromIsoDay(fieldState?.value as string | undefined)}
      onChange={(date) => {
        fieldState?.change(date ? isoDayFromLocalDate(date) : '');
        fieldState?.blur();
      }}
      placeholder={t`Pick a date`}
      modal
      commit="immediate"
      minDate={minDate ?? undefined}
      triggerClassName="w-full"
    />
  );
}

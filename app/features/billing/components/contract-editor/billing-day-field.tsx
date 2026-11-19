import type { ContractFormValues } from './schema';
import { Form } from '@datum-cloud/datum-ui/form';
import { t } from '@lingui/core/macro';
import { SelectOrdinal, Trans } from '@lingui/react/macro';

type BillingDay = ContractFormValues['billingDay'];

/** A day of the month as an ordinal: 1st, 2nd, 18th. */
function Day({ day }: { day: number }) {
  return <SelectOrdinal value={day} one="#st" two="#nd" few="#rd" other="#th" />;
}

/**
 * What each invoice covers, for the billing day chosen. `startDay` is the
 * picked start date's day of the month, once there is one.
 */
export function BillingDayHint({
  billingDay,
  startDay,
  invoiceDay,
}: {
  billingDay: BillingDay | undefined;
  startDay: number | undefined;
  invoiceDay: number;
}) {
  if (billingDay === 'InvoiceDay') {
    return startDay ? (
      <Trans>
        The first invoice covers the <Day day={startDay} /> to the <Day day={invoiceDay} />. After
        that, every invoice covers a whole month, the <Day day={invoiceDay} /> to the{' '}
        <Day day={invoiceDay} />.
      </Trans>
    ) : (
      <Trans>
        The first invoice covers the start date to the <Day day={invoiceDay} />. After that, every
        invoice covers a whole month, the <Day day={invoiceDay} /> to the <Day day={invoiceDay} />.
      </Trans>
    );
  }
  if (!startDay) {
    return <Trans>Every invoice covers a whole month from the start date.</Trans>;
  }
  return startDay > 28 ? (
    <Trans>
      Every invoice covers a whole month, the <Day day={startDay} /> to the <Day day={startDay} />,
      or the month&apos;s last day when it&apos;s shorter.
    </Trans>
  ) : (
    <Trans>
      Every invoice covers a whole month, the <Day day={startDay} /> to the <Day day={startDay} />.
    </Trans>
  );
}

/**
 * The day of the month a new contract bills on: its start date's, with
 * every invoice a whole month, or the account's invoice day, with the
 * first month prorated.
 */
export function BillingDayField({ invoiceDay }: { invoiceDay: number }) {
  const picked = Form.useWatch('startsAt') as Date | undefined;
  const billingDay = Form.useWatch('billingDay') as BillingDay | undefined;
  // The picker works in the browser's zone: its day is the day picked.
  const startDay = picked ? picked.getDate() : undefined;

  return (
    <Form.Field
      name="billingDay"
      label={t`Bills on`}
      description={
        <>
          <BillingDayHint billingDay={billingDay} startDay={startDay} invoiceDay={invoiceDay} />{' '}
          <Trans>Can&apos;t be changed once the contract is saved.</Trans>
        </>
      }>
      <Form.Select>
        <Form.SelectItem value="StartDate">
          {startDay ? (
            <Trans>
              The <Day day={startDay} /> of each month (the start date)
            </Trans>
          ) : (
            <Trans>The start date&apos;s day each month</Trans>
          )}
        </Form.SelectItem>
        <Form.SelectItem value="InvoiceDay">
          <Trans>
            The <Day day={invoiceDay} /> of each month, with the first month prorated
          </Trans>
        </Form.SelectItem>
      </Form.Select>
    </Form.Field>
  );
}

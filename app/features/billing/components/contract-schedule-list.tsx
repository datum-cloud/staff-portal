import { CONTRACT_CURRENCY } from '../lib/contract';
import { notableInvoices, type ScheduledInvoice } from '../lib/contract-schedule';
import { formatMoney } from '../utils';
import { InlineDate } from './billing-account-dashboard/card-parts';
import { chargeNamesText } from './contract-fee-text';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';

/**
 * A contract's invoices still to come: the next one and those that charge a
 * one-time, quarterly or annual fee, with the rest of the next 12 months a
 * click away. Each shows its date, its fixed charges and their total, "plus
 * usage" when usage is billed on it, and when it's due.
 */
export function ContractScheduleList({ upcoming }: { upcoming: ScheduledInvoice[] }) {
  const [all, setAll] = useState(false);
  const notable = notableInvoices(upcoming);
  const shown = all ? upcoming : notable;
  if (upcoming.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Text size="sm" weight="medium">
        <Trans>Upcoming invoices</Trans>
      </Text>
      <ul className="flex flex-col gap-2">
        {shown.map((invoice) => {
          const total = formatMoney(invoice.total, CONTRACT_CURRENCY);
          return (
            <li key={invoice.date.toISOString()} className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <Text size="sm">
                  <InlineDate
                    date={invoice.date.toISOString()}
                    variant="absolute"
                    format="MMM d, yyyy"
                  />
                </Text>
                {invoice.charges.length > 0 ? (
                  // However many fees are on it, one line: the first two and
                  // how many more, with the full list on hover.
                  <Text
                    size="xs"
                    textColor="muted"
                    className="truncate"
                    title={invoice.charges.map((charge) => charge.label).join(', ')}>
                    {chargeNamesText(invoice.charges.map((charge) => charge.label))}
                  </Text>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <Text size="sm" className="tabular-nums">
                  {invoice.charges.length === 0 ? (
                    <Trans>Usage</Trans>
                  ) : invoice.billsUsage ? (
                    <Trans>{total} plus usage</Trans>
                  ) : (
                    total
                  )}
                </Text>
                {invoice.dueDate ? (
                  <Text size="xs" textColor="muted">
                    <Trans>
                      Due{' '}
                      <InlineDate
                        date={invoice.dueDate.toISOString()}
                        variant="absolute"
                        format="MMM d"
                      />
                    </Trans>
                  </Text>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {upcoming.length > notable.length ? (
        <div>
          <Button
            type="quaternary"
            theme="borderless"
            size="small"
            htmlType="button"
            className="-ml-2"
            onClick={() => setAll((value) => !value)}>
            {all ? <Trans>Show fewer</Trans> : <Trans>Show every month for a year</Trans>}
          </Button>
        </div>
      ) : null}
      <Text size="xs" textColor="muted">
        <Trans>
          Estimated from the contract&apos;s fees, before tax and any offer-wide discount. Invoices
          can arrive a little after their date.
        </Trans>
      </Text>
    </div>
  );
}

import { CONTRACT_CURRENCY } from '../lib/contract';
import { notableInvoices, type ScheduledInvoice } from '../lib/contract-schedule';
import { formatMoney } from '../utils';
import { InlineDate } from './billing-account-dashboard/card-parts';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
            <li key={invoice.date.toISOString()} className="flex flex-col">
              <div className="flex items-baseline justify-between gap-3">
                <Text size="sm">
                  <InlineDate
                    date={invoice.date.toISOString()}
                    variant="absolute"
                    format="MMM d, yyyy"
                    timezone="UTC"
                  />
                </Text>
                <Text size="sm" className="shrink-0 tabular-nums">
                  {invoice.charges.length === 0 ? (
                    <Trans>Usage only</Trans>
                  ) : invoice.billsUsage ? (
                    <Trans>{total} plus usage</Trans>
                  ) : (
                    total
                  )}
                </Text>
              </div>
              <Text size="xs" textColor="muted">
                {invoice.charges.map((charge) => charge.label).join(' · ')}
                {invoice.dueDate ? (
                  <>
                    {invoice.charges.length > 0 ? ' · ' : null}
                    <Trans>
                      due{' '}
                      <InlineDate
                        date={invoice.dueDate.toISOString()}
                        variant="absolute"
                        format="MMM d"
                        timezone="UTC"
                      />
                    </Trans>
                  </>
                ) : null}
              </Text>
            </li>
          );
        })}
      </ul>
      {upcoming.length > notable.length ? (
        <div>
          {/* A link-style toggle, so it doesn't read as one of the form's buttons. */}
          <button
            type="button"
            className="text-foreground flex items-center gap-1 text-sm underline underline-offset-2"
            aria-expanded={all}
            onClick={() => setAll((value) => !value)}>
            {all ? <Trans>Show fewer</Trans> : <Trans>Show all 12 months</Trans>}
            <Icon icon={all ? ChevronUp : ChevronDown} size={14} />
          </button>
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

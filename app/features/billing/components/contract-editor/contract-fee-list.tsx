import {
  CONTRACT_CURRENCY,
  DEFAULT_FEE_BILLING_TIMING,
  MAX_CONTRACT_FEES,
} from '../../lib/contract';
import { NO_SERVICE, type ContractFeeRow, type ContractFormValues } from './schema';
import { WholeNumberInput } from './whole-number-input';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Plus, X } from 'lucide-react';

export type ServiceOption = { serviceName: string; label: string };

/**
 * Fees made for this contract, one row each: a name for invoices, the unit
 * amount and how many, one-time or recurring, optionally what the amount is
 * per, and the service it's for, if any. A recurring fee is charged every
 * month, quarter or year, and billed in advance or in arrears. Each fee is
 * its own pricing and invoice line. Fees from the price list are picked in
 * the price list.
 */
export function ContractFeeList({
  services,
  allowOneTime,
}: {
  services: ServiceOption[];
  allowOneTime: boolean;
}) {
  const fees = (Form.useWatch('fees') as ContractFeeRow[] | undefined) ?? [];
  return (
    <Form.FieldArray name="fees">
      {({ fields, append, remove }) => {
        const addFee = (
          <Button
            type="secondary"
            theme="outline"
            size="small"
            htmlType="button"
            icon={<Icon icon={Plus} size={14} />}
            disabled={fields.length >= MAX_CONTRACT_FEES}
            onClick={() =>
              append({
                label: '',
                chargeType: 'Recurring',
                interval: 'monthly',
                billingTiming: DEFAULT_FEE_BILLING_TIMING,
                amount: '',
                quantity: '1',
                pricingUnit: '',
                // New fees are usually for the same service as the last.
                serviceRef: fees[fees.length - 1]?.serviceRef ?? NO_SERVICE,
              } satisfies ContractFeeRow)
            }>
            <Trans>Add fee</Trans>
          </Button>
        );
        if (fields.length === 0) {
          return (
            <div className="flex items-center justify-between gap-3 rounded-md border border-dashed px-4 py-3">
              <Text size="sm" textColor="muted">
                <Trans>No contract fees.</Trans>
              </Text>
              {addFee}
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div key={field.key} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_8rem_5rem_auto] items-start gap-2">
                  <Form.Field name={`fees.${index}.label`} label={t`Name`} required>
                    <Form.Input placeholder={t`Dedicated server`} />
                  </Form.Field>
                  <Form.Field
                    name={`fees.${index}.amount`}
                    label={t`Amount (${CONTRACT_CURRENCY})`}
                    required>
                    <Form.Input inputMode="decimal" placeholder="1000.00" />
                  </Form.Field>
                  <Form.Field name={`fees.${index}.quantity`} label={t`Quantity`} required>
                    <WholeNumberInput placeholder="1" />
                  </Form.Field>
                  <Button
                    type="quaternary"
                    theme="borderless"
                    size="small"
                    htmlType="button"
                    className="mt-6"
                    aria-label={t`Remove fee`}
                    icon={<Icon icon={X} size={14} />}
                    onClick={() => remove(index)}
                  />
                </div>
                <div className="grid grid-cols-[8rem_8rem_9rem] items-start gap-2">
                  <Form.Field name={`fees.${index}.chargeType`} label={t`Charged`} required>
                    <Form.Select>
                      {allowOneTime || fees[index]?.chargeType === 'OneTime' ? (
                        <Form.SelectItem value="OneTime">
                          <Trans>Once</Trans>
                        </Form.SelectItem>
                      ) : null}
                      <Form.SelectItem value="Recurring">
                        <Trans>Recurring</Trans>
                      </Form.SelectItem>
                    </Form.Select>
                  </Form.Field>
                  {fees[index]?.chargeType === 'Recurring' ? (
                    <>
                      <Form.Field name={`fees.${index}.interval`} label={t`Every`} required>
                        <Form.Select>
                          <Form.SelectItem value="monthly">
                            <Trans>Month</Trans>
                          </Form.SelectItem>
                          <Form.SelectItem value="quarterly">
                            <Trans>Quarter</Trans>
                          </Form.SelectItem>
                          <Form.SelectItem value="annual">
                            <Trans>Year</Trans>
                          </Form.SelectItem>
                        </Form.Select>
                      </Form.Field>
                      <Form.Field
                        name={`fees.${index}.billingTiming`}
                        label={t`Billed`}
                        required
                        tooltip={t`In arrears invoices each period's fee at its end, with that period's usage. In advance invoices it when the period starts, as is usual for rent-like charges such as rack space.`}>
                        <Form.Select>
                          <Form.SelectItem value="InArrears">
                            <Trans>In arrears</Trans>
                          </Form.SelectItem>
                          <Form.SelectItem value="InAdvance">
                            <Trans>In advance</Trans>
                          </Form.SelectItem>
                        </Form.Select>
                      </Form.Field>
                    </>
                  ) : null}
                </div>
                <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-2">
                  <Form.Field name={`fees.${index}.pricingUnit`} label={t`Per`}>
                    <Form.Input placeholder={t`port, kW`} />
                  </Form.Field>
                  <Form.Field name={`fees.${index}.serviceRef`} label={t`Service`}>
                    <Form.Select>
                      <Form.SelectItem value={NO_SERVICE}>
                        <Trans>None</Trans>
                      </Form.SelectItem>
                      {services.map((service) => (
                        <Form.SelectItem key={service.serviceName} value={service.serviceName}>
                          {service.label}
                        </Form.SelectItem>
                      ))}
                    </Form.Select>
                  </Form.Field>
                </div>
              </div>
            ))}
            <div>{addFee}</div>
          </div>
        );
      }}
    </Form.FieldArray>
  );
}

import { MAX_CONTRACT_FEES } from '../../lib/contract';
import {
  CONTRACT_CURRENCY,
  NO_SERVICE,
  type ContractFeeRow,
  type ContractFormValues,
} from './schema';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Plus, X } from 'lucide-react';
import { useFormState, type UseFormReturn } from 'react-hook-form';

export type ServiceOption = { serviceName: string; label: string };

/**
 * Fees made for this contract, one row each: a name for invoices, the unit
 * amount and how many, optionally what the amount is per, one-time or
 * monthly, and the service it's for, if any. Each fee is its own pricing and
 * invoice line. Fees from the price list are picked in the price list.
 */
export function ContractFeeList({
  services,
  allowOneTime,
}: {
  services: ServiceOption[];
  allowOneTime: boolean;
}) {
  const fees = (Form.useWatch('fees') as ContractFeeRow[] | undefined) ?? [];
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const { errors } = useFormState({ control: form.control, name: 'fees' });
  const listError = errors.fees?.message ?? errors.fees?.root?.message;
  return (
    <Form.FieldArray name="fees">
      {({ fields, append, remove }) => (
        <div className="flex flex-col gap-3">
          {fields.length === 0 ? (
            <Text size="sm" textColor="muted">
              <Trans>None: the contract charges only what&apos;s picked from the price list.</Trans>
            </Text>
          ) : null}
          {listError ? (
            <Text size="sm" textColor="destructive" role="alert">
              {listError}
            </Text>
          ) : null}
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
                  <Form.Input inputMode="numeric" placeholder="1" />
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
              <div className="grid grid-cols-[8rem_7rem_minmax(0,1fr)] items-start gap-2">
                <Form.Field name={`fees.${index}.chargeType`} label={t`Charged`} required>
                  <Form.Select>
                    {allowOneTime || fees[index]?.chargeType === 'OneTime' ? (
                      <Form.SelectItem value="OneTime">
                        <Trans>Once</Trans>
                      </Form.SelectItem>
                    ) : null}
                    <Form.SelectItem value="Recurring">
                      <Trans>Monthly</Trans>
                    </Form.SelectItem>
                  </Form.Select>
                </Form.Field>
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
          <div>
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
                  amount: '',
                  quantity: '1',
                  pricingUnit: '',
                  // New fees are usually for the same service as the last.
                  serviceRef: fees[fees.length - 1]?.serviceRef ?? NO_SERVICE,
                } satisfies ContractFeeRow)
              }>
              <Trans>Add fee</Trans>
            </Button>
          </div>
        </div>
      )}
    </Form.FieldArray>
  );
}

import { BadgeState } from '@/components/badge';
import { formatChargeType } from '@/features/billing/utils';
import {
  useAppendChargesToServiceConfigurationMutation,
  type ServiceCharge,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConfiguration } from '@openapi/services.miloapis.com/v1alpha1';
import { useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

const decimalSchema = z
  .string()
  .min(1, 'Required')
  .regex(/^(0|[1-9]\d*)(\.\d+)?$/, 'Must be a non-negative decimal');

const bandSchema = z.object({
  upTo: z.string().optional(),
  rate: z.string().optional(),
});

const rateRowSchema = z.object({
  matchDimension: z.string().optional(),
  matchValue: z.string().optional(),
  mode: z.enum(['flat', 'tiered']),
  flat: z.string().optional(),
  bands: z.array(bandSchema).optional(),
});

const chargeFormSchema = z
  .object({
    chargeType: z.enum(['Usage', 'OneTime', 'Recurring']),
    name: z.string().min(1, 'Name is required'),
    displayName: z.string().optional(),
    metricRef: z.string().optional(),
    pricingUnit: z.string().optional(),
    rates: z.array(rateRowSchema).optional(),
    amount: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.chargeType !== 'Usage') {
      if (!values.amount || !decimalSchema.safeParse(values.amount).success) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid USD decimal', path: ['amount'] });
      }
      return;
    }

    if (!values.metricRef) {
      ctx.addIssue({ code: 'custom', message: 'Select a meter', path: ['metricRef'] });
    }
    if (!values.pricingUnit?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Required', path: ['pricingUnit'] });
    }

    const rates = values.rates ?? [];
    if (rates.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Add at least one rate row',
        path: ['rates'],
      });
      return;
    }

    const anyMatched = rates.some((rate) => !!normalizeMatchDimension(rate.matchDimension));

    rates.forEach((rate, index) => {
      const dim = normalizeMatchDimension(rate.matchDimension);
      const val = rate.matchValue?.trim() ?? '';

      // Amberflo cannot sync unmatched catch-all beside matched rates. When any
      // row uses a dimension match, every row must set dimension + value
      // (use an explicit sentinel such as "other" for fallbacks).
      if (anyMatched) {
        if (!dim) {
          ctx.addIssue({
            code: 'custom',
            message:
              'Current billing backend requires every rate to match a dimension value when any rate uses matching. Use an explicit fallback value (e.g. other), not an unmatched catch-all.',
            path: ['rates', index, 'matchDimension'],
          });
        } else if (!val) {
          ctx.addIssue({
            code: 'custom',
            message: 'Match value is required (e.g. us-central1 or other)',
            path: ['rates', index, 'matchValue'],
          });
        }
      } else if ((dim && !val) || (!dim && val)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Set both dimension and value, or leave both empty for a meter-wide rate',
          path: ['rates', index, 'matchDimension'],
        });
      }

      if (rate.mode === 'flat') {
        if (!rate.flat || !decimalSchema.safeParse(rate.flat).success) {
          ctx.addIssue({
            code: 'custom',
            message: 'Enter a valid USD decimal',
            path: ['rates', index, 'flat'],
          });
        }
        return;
      }

      const bands = rate.bands ?? [];
      if (bands.length < 2) {
        ctx.addIssue({
          code: 'custom',
          message: 'Tiered rates need at least two bands (last band open-ended)',
          path: ['rates', index, 'bands'],
        });
        return;
      }

      bands.forEach((band, bandIndex) => {
        const isLast = bandIndex === bands.length - 1;
        if (!band.rate || !decimalSchema.safeParse(band.rate).success) {
          ctx.addIssue({
            code: 'custom',
            message: 'Enter a valid USD decimal',
            path: ['rates', index, 'bands', bandIndex, 'rate'],
          });
        }
        if (isLast) {
          if (band.upTo?.trim()) {
            ctx.addIssue({
              code: 'custom',
              message: 'Last band must omit upTo (open-ended)',
              path: ['rates', index, 'bands', bandIndex, 'upTo'],
            });
          }
        } else if (!band.upTo || !decimalSchema.safeParse(band.upTo).success) {
          ctx.addIssue({
            code: 'custom',
            message: 'Required upper bound',
            path: ['rates', index, 'bands', bandIndex, 'upTo'],
          });
        }
      });
    });
  });

type ChargeFormValues = z.infer<typeof chargeFormSchema>;

/** Select sentinel for "no dimension filter" (meter-wide rate). Not a Milo catch-all. */
const NO_MATCH_DIMENSION = '__none';

function normalizeMatchDimension(value?: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed === NO_MATCH_DIMENSION) return '';
  return trimmed;
}

function emptyFlatRate(matchDimension = ''): NonNullable<ChargeFormValues['rates']>[number] {
  return {
    matchDimension,
    matchValue: '',
    mode: 'flat',
    flat: '0',
    bands: [
      { upTo: '1000', rate: '0' },
      { upTo: '', rate: '0' },
    ],
  };
}

function buildCharge(values: ChargeFormValues): ServiceCharge {
  const displayName = values.displayName?.trim() || undefined;

  if (values.chargeType === 'Usage') {
    const rates = (values.rates ?? []).map((row) => {
      const matchDim = normalizeMatchDimension(row.matchDimension);
      const matchVal = row.matchValue?.trim();
      const match = matchDim && matchVal ? { dimension: matchDim, value: matchVal } : undefined;

      if (row.mode === 'flat') {
        return {
          ...(match ? { match } : {}),
          flat: row.flat!,
        };
      }

      return {
        ...(match ? { match } : {}),
        tiered: (row.bands ?? []).map((band, bandIndex, all) => {
          const isLast = bandIndex === all.length - 1;
          return {
            ...(isLast || !band.upTo?.trim() ? {} : { upTo: band.upTo.trim() }),
            rate: band.rate!,
          };
        }),
      };
    });

    return {
      name: values.name.trim(),
      chargeType: 'Usage',
      displayName,
      currency: 'USD',
      usage: {
        metricRef: values.metricRef!,
        pricingUnit: values.pricingUnit!.trim(),
        rates,
      },
    };
  }

  if (values.chargeType === 'OneTime') {
    return {
      name: values.name.trim(),
      chargeType: 'OneTime',
      displayName,
      currency: 'USD',
      oneTime: {
        amount: values.amount!,
        trigger: 'BillingAccountActivation',
      },
    };
  }

  return {
    name: values.name.trim(),
    chargeType: 'Recurring',
    displayName,
    currency: 'USD',
    recurring: {
      amount: values.amount!,
      interval: 'monthly',
    },
  };
}

type Metric = NonNullable<
  NonNullable<ComMiloapisServicesV1Alpha1ServiceConfiguration['spec']>['metrics']
>[number];

function suggestUsageChargeName(metricRef: string | undefined): string {
  return metricRef?.trim() ?? '';
}

function suggestFixedChargeName(
  serviceCanonicalName: string,
  chargeType: 'OneTime' | 'Recurring'
): string {
  const suffix = chargeType === 'OneTime' ? 'setup-fee' : 'access-fee';
  return `${serviceCanonicalName}/${suffix}`;
}

function suggestChargeName(
  chargeType: ChargeFormValues['chargeType'],
  serviceCanonicalName: string,
  metricRef: string | undefined
): string {
  if (chargeType === 'Usage') {
    return suggestUsageChargeName(metricRef);
  }
  return suggestFixedChargeName(serviceCanonicalName, chargeType);
}

type AddChargeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  configurationName: string;
  serviceCanonicalName: string;
  metrics: Metric[];
};

function RateRowFields({
  rateFieldName,
  index,
  onRemove,
  canRemove,
  availableDimensions,
  requireExplicitMatch,
}: {
  rateFieldName: string;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  availableDimensions: string[];
  /** True when any rate row already uses a dimension match (Amberflo-safe authoring). */
  requireExplicitMatch: boolean;
}) {
  const mode = (Form.useWatch(`${rateFieldName}.mode`) as 'flat' | 'tiered' | undefined) ?? 'flat';
  const matchDimension =
    (Form.useWatch(`${rateFieldName}.matchDimension`) as string | undefined) ?? '';
  const hasDeclaredDimensions = availableDimensions.length > 0;
  const isMeterWide =
    !normalizeMatchDimension(matchDimension) || (!hasDeclaredDimensions && !matchDimension.trim());

  return (
    <div className="bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <Text size="sm" weight="medium">
          <Trans>Rate {index + 1}</Trans>
        </Text>
        {canRemove ? (
          <Button
            type="tertiary"
            theme="borderless"
            size="small"
            icon={<ACTION_ICONS.close size={14} />}
            htmlType="button"
            onClick={onRemove}
          />
        ) : null}
      </div>

      {hasDeclaredDimensions ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Form.Field name={`${rateFieldName}.matchDimension`} label={t`Applies to`}>
            <Form.Select>
              {!requireExplicitMatch ? (
                <Form.SelectItem value={NO_MATCH_DIMENSION}>
                  {t`All usage (no filter)`}
                </Form.SelectItem>
              ) : null}
              {availableDimensions.map((dimension) => (
                <Form.SelectItem key={dimension} value={dimension}>
                  {dimension}
                </Form.SelectItem>
              ))}
            </Form.Select>
          </Form.Field>
          {!isMeterWide ? (
            <Form.Field name={`${rateFieldName}.matchValue`} label={t`Value`}>
              <Form.Input placeholder={requireExplicitMatch ? 'other' : 'us-central1'} />
            </Form.Field>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Form.Field name={`${rateFieldName}.matchDimension`} label={t`Dimension (optional)`}>
            <Form.Input placeholder="region" />
          </Form.Field>
          <Form.Field name={`${rateFieldName}.matchValue`} label={t`Value (optional)`}>
            <Form.Input placeholder="us-central1" />
          </Form.Field>
        </div>
      )}

      {mode === 'flat' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Form.Field name={`${rateFieldName}.mode`} label={t`Pricing`} required>
            <Form.Select>
              <Form.SelectItem value="flat">{t`Flat`}</Form.SelectItem>
              <Form.SelectItem value="tiered">{t`Tiered (graduated)`}</Form.SelectItem>
            </Form.Select>
          </Form.Field>
          <Form.Field name={`${rateFieldName}.flat`} label={t`Rate (USD)`} required>
            <Form.Input placeholder="0.000001" />
          </Form.Field>
        </div>
      ) : (
        <>
          <Form.Field name={`${rateFieldName}.mode`} label={t`Pricing`} required>
            <Form.Select>
              <Form.SelectItem value="flat">{t`Flat`}</Form.SelectItem>
              <Form.SelectItem value="tiered">{t`Tiered (graduated)`}</Form.SelectItem>
            </Form.Select>
          </Form.Field>
          <Form.FieldArray name={`${rateFieldName}.bands`}>
            {({ fields, append, remove, move }) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Text size="sm" weight="medium">
                    <Trans>Volume bands</Trans>
                  </Text>
                  <Button
                    type="tertiary"
                    theme="outline"
                    size="small"
                    icon={<ACTION_ICONS.add size={14} />}
                    htmlType="button"
                    onClick={() => {
                      const openEndedIndex = fields.length - 1;
                      append({ upTo: '10000', rate: '0' });
                      move(openEndedIndex + 1, openEndedIndex);
                    }}>
                    <Trans>Add band</Trans>
                  </Button>
                </div>
                {fields.map((bandField, bandIndex) => {
                  const isLast = bandIndex === fields.length - 1;
                  return (
                    <div
                      key={bandField.key}
                      className="bg-background grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto]">
                      <Form.Field
                        name={`${bandField.name}.upTo`}
                        label={isLast ? t`Up to (open-ended)` : t`Up to`}
                        required={!isLast}>
                        <Form.Input placeholder={isLast ? '' : '1000000'} disabled={isLast} />
                      </Form.Field>
                      <Form.Field name={`${bandField.name}.rate`} label={t`Rate (USD)`} required>
                        <Form.Input placeholder="0" />
                      </Form.Field>
                      <div className="flex items-end pb-1">
                        <Button
                          type="tertiary"
                          theme="borderless"
                          size="small"
                          icon={<ACTION_ICONS.close size={14} />}
                          htmlType="button"
                          disabled={fields.length <= 2 || isLast}
                          onClick={() => remove(bandIndex)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Form.FieldArray>
        </>
      )}
    </div>
  );
}

function ChargeFormFields({
  serviceCanonicalName,
  metrics,
}: {
  serviceCanonicalName: string;
  metrics: Metric[];
}) {
  const chargeType = (Form.useWatch('chargeType') as ChargeFormValues['chargeType']) ?? 'Usage';
  const metricRef = Form.useWatch('metricRef') as string | undefined;
  const { form } = Form.useFormContext();
  const lastSuggestedName = useRef('');
  const watchedRates = (Form.useWatch('rates') as ChargeFormValues['rates']) ?? [];
  const selectedMetric = metrics.find((metric) => metric.name === metricRef);
  const availableDimensions = selectedMetric?.dimensions ?? [];
  const hasDeclaredDimensions = availableDimensions.length > 0;
  const requireExplicitMatch = watchedRates.some(
    (rate) => !!normalizeMatchDimension(rate.matchDimension)
  );
  const firstDimension = availableDimensions[0];

  useEffect(() => {
    const suggested = suggestChargeName(chargeType, serviceCanonicalName, metricRef);
    if (!suggested) return;

    const rhf = form.raw as UseFormReturn<ChargeFormValues>;
    const current = (rhf.getValues('name') ?? '').trim();
    if (current && current !== lastSuggestedName.current) return;

    rhf.setValue('name', suggested, { shouldDirty: true, shouldValidate: true });
    lastSuggestedName.current = suggested;
  }, [chargeType, form, metricRef, serviceCanonicalName]);

  return (
    <>
      <Form.Field name="chargeType" label={t`Charge type`} required>
        <Form.Select>
          {(['Usage', 'OneTime', 'Recurring'] as const).map((type) => (
            <Form.SelectItem key={type} value={type}>
              {formatChargeType(type)}
            </Form.SelectItem>
          ))}
        </Form.Select>
      </Form.Field>

      {chargeType === 'Usage' ? (
        <>
          <Form.Field name="metricRef" label={t`Meter`} required>
            <Form.Select>
              {metrics.length === 0 ? (
                <Form.SelectItem value="__none" disabled>
                  {t`No meters on this configuration`}
                </Form.SelectItem>
              ) : (
                metrics.map((metric) => (
                  <Form.SelectItem key={metric.name} value={metric.name}>
                    {metric.displayName ?? metric.name}
                  </Form.SelectItem>
                ))
              )}
            </Form.Select>
          </Form.Field>
          {selectedMetric ? (
            <div className="bg-muted/40 rounded-md border px-3 py-2">
              <Text size="xs" textColor="muted">
                <Trans>Rateable dimensions on this meter:</Trans>
              </Text>
              {availableDimensions.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {availableDimensions.map((dimension) => (
                    <BadgeState key={dimension} state="info" message={dimension} />
                  ))}
                </div>
              ) : (
                <Text size="xs" textColor="muted" className="mt-1 italic">
                  <Trans>
                    None declared. Usage events cannot carry priced labels on this meter.
                  </Trans>
                </Text>
              )}
            </div>
          ) : null}
          <Form.Field name="name" label={t`Charge name`} required>
            <Form.Input />
          </Form.Field>
          <Form.Field name="displayName" label={t`Display name`}>
            <Form.Input placeholder={t`CPU allocated`} />
          </Form.Field>
          <Form.Field name="pricingUnit" label={t`Pricing unit`} required>
            <Form.Input placeholder="vcpu" />
          </Form.Field>

          <Form.FieldArray name="rates">
            {({ fields, append, remove }) => (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      <Trans>Rates</Trans>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {requireExplicitMatch ? (
                        <Trans>
                          Add a row per price variant. When matching on a dimension, set a price for
                          every value (use other as a catch-all).
                        </Trans>
                      ) : hasDeclaredDimensions ? (
                        <Trans>
                          Add a row per price variant. Leave Applies to as “All usage” for one price
                          across the whole meter.
                        </Trans>
                      ) : (
                        <Trans>
                          Add a row per price variant, or leave matching empty for one price.
                        </Trans>
                      )}
                    </p>
                  </div>
                  <Button
                    type="tertiary"
                    theme="outline"
                    size="small"
                    className="shrink-0"
                    icon={<ACTION_ICONS.add size={14} />}
                    htmlType="button"
                    onClick={() => {
                      // Prefer an explicit dimension once authors are matching (or adding
                      // a second row). Otherwise meter-wide: Select uses NO_MATCH_DIMENSION.
                      const nextDimension =
                        requireExplicitMatch || fields.length >= 1
                          ? (firstDimension ?? '')
                          : hasDeclaredDimensions
                            ? NO_MATCH_DIMENSION
                            : '';
                      append(emptyFlatRate(nextDimension));
                    }}>
                    <Trans>Add rate</Trans>
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <RateRowFields
                    key={field.key}
                    rateFieldName={field.name}
                    index={index}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(index)}
                    availableDimensions={availableDimensions}
                    requireExplicitMatch={requireExplicitMatch}
                  />
                ))}
              </div>
            )}
          </Form.FieldArray>
        </>
      ) : (
        <>
          <Form.Field name="name" label={t`Charge name`} required>
            <Form.Input />
          </Form.Field>
          <Form.Field name="displayName" label={t`Display name`}>
            <Form.Input placeholder={chargeType === 'OneTime' ? t`Setup fee` : t`Access fee`} />
          </Form.Field>
          <Form.Field name="amount" label={t`Amount (USD)`} required>
            <Form.Input placeholder="10.00" />
          </Form.Field>
          <Text size="sm" textColor="muted">
            {chargeType === 'OneTime' ? (
              <Trans>Trigger is fixed to BillingAccountActivation.</Trans>
            ) : (
              <Trans>Interval is fixed to monthly.</Trans>
            )}
          </Text>
        </>
      )}
    </>
  );
}

export function AddChargeDialog({
  open,
  onOpenChange,
  serviceName,
  configurationName,
  serviceCanonicalName,
  metrics,
}: AddChargeDialogProps) {
  const appendMutation = useAppendChargesToServiceConfigurationMutation(serviceName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultMeterWideDimension =
    (metrics[0]?.dimensions?.length ?? 0) > 0 ? NO_MATCH_DIMENSION : '';
  const defaultMeter = metrics[0]?.name ?? '';
  const defaultValues: ChargeFormValues = {
    chargeType: 'Usage',
    name: suggestUsageChargeName(defaultMeter),
    displayName: '',
    metricRef: defaultMeter,
    pricingUnit: '',
    // Start meter-wide; authors opt into dimension matches per row.
    rates: [emptyFlatRate(defaultMeterWideDimension)],
    amount: '0',
  };

  const handleOpenChange = (next: boolean) => {
    if (!isSubmitting) onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content className="sm:max-w-2xl">
        <Dialog.Header
          title={t`Add charge`}
          description={t`Add a usage-based, one-time, or recurring price. Usage prices can vary by region, tier, or other dimensions, with flat or tiered rates.`}
        />
        <Form.Root
          key={open ? configurationName : 'closed'}
          schema={chargeFormSchema}
          defaultValues={defaultValues}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={async (values) => {
            setIsSubmitting(true);
            try {
              const next = { ...values };
              if (next.chargeType === 'Usage' && !next.name.trim() && next.metricRef) {
                next.name = next.metricRef;
              }
              const charge = buildCharge(next);
              if (
                serviceCanonicalName &&
                !charge.name.startsWith(`${serviceCanonicalName}/`) &&
                !charge.name.startsWith(serviceCanonicalName) &&
                !charge.name.includes('.')
              ) {
                charge.name = `${serviceCanonicalName}/${charge.name}`;
              }
              await appendMutation.mutateAsync({
                configurationName,
                charges: [charge],
              });
              toast.success(t`Charge added`);
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t`Failed to add charge`);
            } finally {
              setIsSubmitting(false);
            }
          }}>
          {({ isDirty, isValid }) => (
            <>
              <Dialog.Body className="space-y-4 px-5">
                <ChargeFormFields serviceCanonicalName={serviceCanonicalName} metrics={metrics} />
              </Dialog.Body>
              <Dialog.Footer className="shrink-0 gap-2">
                <Button
                  type="tertiary"
                  theme="borderless"
                  htmlType="button"
                  disabled={isSubmitting}
                  onClick={() => handleOpenChange(false)}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={!isDirty || !isValid || isSubmitting}>
                  <Trans>Add charge</Trans>
                </Button>
              </Dialog.Footer>
            </>
          )}
        </Form.Root>
      </Dialog.Content>
    </Dialog>
  );
}

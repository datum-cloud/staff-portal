import type { Route } from './+types/create';
import { ServicePricingChecklist } from '@/features/billing';
import {
  CHARGE_TYPES,
  DEFAULT_SERVICE_PRICING_NAMESPACE,
  formatChargeType,
  type ChargeType,
} from '@/features/billing/utils';
import { SectionCard } from '@/features/milo';
import { useCreateOfferMutation, useServicePricingListQuery } from '@/resources/request/client';
import { offerRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

export const handle = {
  breadcrumb: () => <Trans>Create</Trans>,
};

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Create Offer`);
};

const offerSchema = z.object({
  name: z
    .string()
    .min(1, 'ID is required')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Must be a valid Kubernetes name'),
  displayName: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerSchema>;

export default function Page() {
  const navigate = useNavigate();
  const createMutation = useCreateOfferMutation();
  const pricingsQuery = useServicePricingListQuery();
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>(['Usage']);
  const [servicePricingNames, setServicePricingNames] = useState<string[]>([]);

  const pricings = useMemo(() => pricingsQuery.data?.items ?? [], [pricingsQuery.data?.items]);

  const handleSubmit = async (values: OfferFormValues) => {
    if (chargeTypes.length === 0) {
      toast.error(t`Select at least one charge type`);
      return;
    }
    if (servicePricingNames.length === 0) {
      toast.error(t`Select at least one ServicePricing`);
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: values.name,
        displayName: values.displayName,
        chargeTypes,
        servicePricingRefs: servicePricingNames.map((name) => ({
          name,
          namespace: DEFAULT_SERVICE_PRICING_NAMESPACE,
        })),
      });
      toast.success(t`Draft Offer created`);
      navigate(offerRoutes.detail(values.name));
    } catch (err) {
      const message = err instanceof Error ? err.message : t`Failed to create Offer`;
      toast.error(message);
    }
  };

  const toggleChargeType = (chargeType: ChargeType, next: boolean) => {
    setChargeTypes((current) =>
      next ? [...current, chargeType] : current.filter((c) => c !== chargeType)
    );
  };

  const togglePricing = (name: string, next: boolean) => {
    setServicePricingNames((current) =>
      next ? [...current, name] : current.filter((n) => n !== name)
    );
  };

  return (
    <div className="m-4">
      <div className="mx-auto max-w-2xl">
        <SectionCard title={<Trans>Create Draft Offer</Trans>}>
          <Form.Root
            className="space-y-4"
            schema={offerSchema}
            defaultValues={{
              name: '',
              displayName: '',
            }}
            onSubmit={handleSubmit}>
            {({ isSubmitting, isDirty, isValid }) => (
              <>
                <Form.Field name="name" label={t`ID`} required>
                  <Form.Input placeholder="payg-v1" />
                </Form.Field>
                <Form.Field name="displayName" label={t`Display name`}>
                  <Form.Input placeholder="Pay as you go" />
                </Form.Field>

                <div>
                  <Text size="sm" weight="medium" className="mb-2">
                    <Trans>Charge types</Trans>
                  </Text>
                  <div className="flex flex-col gap-2">
                    {CHARGE_TYPES.map((chargeType) => (
                      <label key={chargeType} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={chargeTypes.includes(chargeType)}
                          onCheckedChange={(next) => toggleChargeType(chargeType, Boolean(next))}
                        />
                        {formatChargeType(chargeType)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Text size="sm" weight="medium" className="mb-2">
                    <Trans>Service pricings</Trans>
                  </Text>
                  <ServicePricingChecklist
                    pricings={pricings}
                    selectedNames={servicePricingNames}
                    onToggle={togglePricing}
                    isLoading={pricingsQuery.isLoading}
                    isError={pricingsQuery.isError}
                    errorMessage={
                      pricingsQuery.error instanceof Error ? pricingsQuery.error.message : undefined
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="tertiary"
                    theme="borderless"
                    htmlType="button"
                    onClick={() => navigate(offerRoutes.list())}>
                    {t`Cancel`}
                  </Button>
                  <Button
                    htmlType="submit"
                    disabled={
                      !isDirty ||
                      !isValid ||
                      isSubmitting ||
                      chargeTypes.length === 0 ||
                      servicePricingNames.length === 0
                    }
                    loading={isSubmitting}>
                    <Trans>Create draft</Trans>
                  </Button>
                </div>
              </>
            )}
          </Form.Root>
        </SectionCard>
      </div>
    </div>
  );
}

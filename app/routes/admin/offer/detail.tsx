import type { Route } from './+types/detail';
import { BadgeState } from '@/components/badge';
import { DescriptionList } from '@/components/description-list';
import { PageHeader } from '@/components/page-header';
import { DefaultOfferCard, ServicePricingChecklist } from '@/features/billing';
import {
  CHARGE_TYPES,
  DEFAULT_SERVICE_PRICING_NAMESPACE,
  formatChargeType,
  formatChargeTypes,
  getOfferDisplayName,
  type ChargeType,
} from '@/features/billing/utils';
import { SectionCard } from '@/features/milo';
import {
  useOfferDetailQuery,
  usePublishOfferMutation,
  useServicePricingListQuery,
  useUpdateDraftOfferMutation,
  useUpdateOfferDisplayNameMutation,
} from '@/resources/request/client';
import { offerRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1Offer } from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisBillingV1Alpha1ServicePricing } from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { z } from 'zod';

export const handle = {
  breadcrumb: () => <span>Offer</span>,
};

export const meta: Route.MetaFunction = ({ params }) => {
  return metaObject(params.offerName ? `${params.offerName} - Offer` : t`Offer`);
};

const displayNameSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
});

function DraftConfigEditor({
  offer,
  pricings,
  pricingsLoading,
  pricingsError,
  pricingsErrorMessage,
}: {
  offer: ComMiloapisBillingV1Alpha1Offer;
  pricings: ComMiloapisBillingV1Alpha1ServicePricing[];
  pricingsLoading: boolean;
  pricingsError: boolean;
  pricingsErrorMessage?: string;
}) {
  const offerName = offer.metadata?.name ?? '';
  const displayName = getOfferDisplayName(offer);
  const updateDraftMutation = useUpdateDraftOfferMutation();
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>(
    () => (offer.spec?.chargeTypes ?? []) as ChargeType[]
  );
  const [servicePricingNames, setServicePricingNames] = useState<string[]>(() =>
    (offer.spec?.servicePricingRefs ?? []).map((ref) => ref.name)
  );

  const handleSaveDraft = async () => {
    if (chargeTypes.length === 0 || servicePricingNames.length === 0) {
      toast.error(t`Charge types and ServicePricings are required`);
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({
        name: offerName,
        displayName,
        chargeTypes,
        servicePricingRefs: servicePricingNames.map((name) => ({
          name,
          namespace: DEFAULT_SERVICE_PRICING_NAMESPACE,
        })),
      });
      toast.success(t`Draft Offer updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to update Offer`);
    }
  };

  return (
    <SectionCard
      title={<Trans>Draft configuration</Trans>}
      action={
        <Button
          type="secondary"
          theme="outline"
          onClick={handleSaveDraft}
          loading={updateDraftMutation.isPending}>
          <Trans>Save draft</Trans>
        </Button>
      }>
      <div className="space-y-4">
        <div>
          <Text size="sm" weight="medium" className="mb-2">
            <Trans>Charge types</Trans>
          </Text>
          <div className="flex flex-col gap-2">
            {CHARGE_TYPES.map((chargeType) => (
              <label key={chargeType} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={chargeTypes.includes(chargeType)}
                  onCheckedChange={(next) =>
                    setChargeTypes((current) =>
                      next ? [...current, chargeType] : current.filter((c) => c !== chargeType)
                    )
                  }
                />
                {formatChargeType(chargeType)}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Text size="sm" weight="medium" className="mb-2">
            <Trans>Service pricing refs</Trans>
          </Text>
          <ServicePricingChecklist
            pricings={pricings}
            selectedNames={servicePricingNames}
            onToggle={(name, next) =>
              setServicePricingNames((current) =>
                next ? [...current, name] : current.filter((n) => n !== name)
              )
            }
            isLoading={pricingsLoading}
            isError={pricingsError}
            errorMessage={pricingsErrorMessage}
          />
        </div>
      </div>
    </SectionCard>
  );
}

export default function Page() {
  const { offerName = '' } = useParams();
  const offerQuery = useOfferDetailQuery(offerName);
  const pricingsQuery = useServicePricingListQuery();
  const publishMutation = usePublishOfferMutation();
  const updateDisplayNameMutation = useUpdateOfferDisplayNameMutation();

  const offer = offerQuery.data;
  const isDraft = offer?.spec?.launchStage === 'Draft';
  const isGA = offer?.spec?.launchStage === 'GA';

  const pricings = useMemo(() => pricingsQuery.data?.items ?? [], [pricingsQuery.data?.items]);
  const displayName = offer ? getOfferDisplayName(offer) : offerName;

  const handlePublish = async () => {
    if (
      !window.confirm(
        t`Publishing snapshots rates into this Offer. After GA the rates are immutable; create a new Offer version to change pricing.`
      )
    ) {
      return;
    }
    try {
      await publishMutation.mutateAsync(offerName);
      toast.success(t`Offer published`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to publish Offer`);
    }
  };

  const handleDisplayNameSubmit = async (values: z.infer<typeof displayNameSchema>) => {
    try {
      await updateDisplayNameMutation.mutateAsync({
        name: offerName,
        displayName: values.displayName,
      });
      toast.success(t`Display name updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to update display name`);
    }
  };

  if (offerQuery.isLoading) {
    return (
      <div className="m-4">
        <PageHeader title={t`Offer`} />
        <SectionCard className="mt-4" contentClassName="py-6">
          <Text>
            <Trans>Loading…</Trans>
          </Text>
        </SectionCard>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="m-4">
        <PageHeader title={t`Offer`} />
        <SectionCard className="mt-4" contentClassName="py-6">
          <Text>
            <Trans>Offer not found or you do not have permission to view it.</Trans>
          </Text>
          <div className="mt-4">
            <Link to={offerRoutes.list()} className="text-sm underline">
              <Trans>Back to Offers</Trans>
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  const refs = offer.spec?.servicePricingRefs ?? [];
  const snapshots = offer.spec?.servicePricings ?? [];
  const canSetAsDefault = isGA && snapshots.length > 0;

  return (
    <div className="m-4 space-y-4">
      <PageHeader
        title={displayName}
        description={
          <div className="flex items-center gap-2">
            <Text size="sm" className="text-muted-foreground">
              {offer.metadata?.name}
            </Text>
            <BadgeState state={offer.spec?.launchStage ?? 'Unknown'} />
          </div>
        }
        actions={
          isDraft ? (
            <Button
              type="primary"
              onClick={handlePublish}
              loading={publishMutation.isPending}
              disabled={(offer.spec?.servicePricingRefs ?? []).length === 0}>
              <Trans>Publish</Trans>
            </Button>
          ) : undefined
        }
      />

      <SectionCard title={<Trans>Overview</Trans>}>
        <DescriptionList
          items={[
            { label: t`ID`, value: offer.metadata?.name ?? '—' },
            { label: t`Display name`, value: displayName || '—' },
            { label: t`Launch stage`, value: offer.spec?.launchStage ?? '—' },
            {
              label: t`Charge types`,
              value: formatChargeTypes(offer.spec?.chargeTypes ?? []) || '—',
            },
            {
              label: t`Published at`,
              value: offer.status?.publishedAt
                ? new Date(offer.status.publishedAt).toLocaleString()
                : '—',
            },
          ]}
        />
      </SectionCard>

      <DefaultOfferCard offerName={offerName} canSetAsDefault={canSetAsDefault} />

      {isGA ? (
        <SectionCard title={<Trans>Display name</Trans>}>
          <Text size="sm" className="text-muted-foreground mb-4">
            <Trans>
              After publish, only the display-name annotation can change. Rate changes need a new
              Offer.
            </Trans>
          </Text>
          <Form.Root
            className="flex max-w-md items-end gap-2"
            schema={displayNameSchema}
            defaultValues={{ displayName }}
            onSubmit={handleDisplayNameSubmit}>
            {({ isSubmitting, isDirty, isValid }) => (
              <>
                <Form.Field name="displayName" label={t`Display name`} required className="flex-1">
                  <Form.Input />
                </Form.Field>
                <Button
                  htmlType="submit"
                  disabled={!isDirty || !isValid || isSubmitting}
                  loading={isSubmitting}>
                  <Trans>Save</Trans>
                </Button>
              </>
            )}
          </Form.Root>
        </SectionCard>
      ) : null}

      {isDraft ? (
        <DraftConfigEditor
          key={offer.metadata?.resourceVersion ?? offerName}
          offer={offer}
          pricings={pricings}
          pricingsLoading={pricingsQuery.isLoading}
          pricingsError={pricingsQuery.isError}
          pricingsErrorMessage={
            pricingsQuery.error instanceof Error ? pricingsQuery.error.message : undefined
          }
        />
      ) : null}

      <SectionCard title={<Trans>Service pricing refs</Trans>}>
        {refs.length === 0 ? (
          <Text size="sm" className="text-muted-foreground">
            <Trans>No refs.</Trans>
          </Text>
        ) : (
          <ul className="space-y-1 text-sm">
            {refs.map((ref) => (
              <li key={`${ref.namespace ?? 'milo-system'}/${ref.name}`}>
                {ref.name}
                <span className="text-muted-foreground">
                  {' '}
                  ({ref.namespace || DEFAULT_SERVICE_PRICING_NAMESPACE})
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={<Trans>Published snapshot</Trans>}>
        {snapshots.length === 0 ? (
          <Text size="sm" className="text-muted-foreground">
            <Trans>Empty while Draft. The controller fills this on publish.</Trans>
          </Text>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap) => (
              <div key={snap.name} className="rounded border p-3 text-sm">
                <div className="font-medium">{snap.name}</div>
                <div className="text-muted-foreground mt-1">
                  {formatChargeType(snap.spec.chargeType)}
                  {snap.spec.displayName ? ` · ${snap.spec.displayName}` : ''}
                  {snap.spec.amount ? ` · $${snap.spec.amount}` : ''}
                  {snap.spec.rates?.length ? ` · ${snap.spec.rates.length} rate(s)` : ''}
                  {snap.spec.metric ? ` · ${snap.spec.metric}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

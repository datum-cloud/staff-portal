import type { Route } from './+types/detail';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { PageHeader } from '@/components/page-header';
import {
  DefaultOfferHeaderActions,
  OfferIncludedPricingList,
  ServicePricingChecklist,
  useDefaultOfferControl,
} from '@/features/billing';
import {
  CHARGE_TYPES,
  DEFAULT_SERVICE_PRICING_NAMESPACE,
  formatChargeType,
  formatChargeTypes,
  formatLaunchStage,
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
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { offerRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Form } from '@datum-cloud/datum-ui/form';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
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
      }
      contentClassName="pt-3">
      <Row type="flex" gutter={[20, 20]}>
        <Col span={24} lg={8}>
          <Text size="sm" weight="medium" className="mb-2">
            <Trans>Charge types</Trans>
          </Text>
          <div className="flex flex-col gap-1.5">
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
        </Col>
        <Col span={24} lg={16}>
          <Text size="sm" weight="medium" className="mb-2">
            <Trans>Service pricing refs</Trans>
            <span className="text-muted-foreground ml-1 font-normal">
              ({servicePricingNames.length})
            </span>
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
        </Col>
      </Row>
    </SectionCard>
  );
}

export default function Page() {
  const { offerName = '' } = useParams();
  const offerQuery = useOfferDetailQuery(offerName);
  const pricingsQuery = useServicePricingListQuery();
  const publishMutation = usePublishOfferMutation();
  const updateDisplayNameMutation = useUpdateOfferDisplayNameMutation();
  const defaultOffer = useDefaultOfferControl(offerName);

  const offer = offerQuery.data;
  const isDraft = offer?.spec?.launchStage === 'Draft';
  const isGA = offer?.spec?.launchStage === 'GA';

  const pricings = useMemo(() => pricingsQuery.data?.items ?? [], [pricingsQuery.data?.items]);
  const displayName = offer ? getOfferDisplayName(offer) : offerName;
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [displayNameDialogOpen, setDisplayNameDialogOpen] = useState(false);
  const launchStage = offer?.spec?.launchStage ?? '';

  const handlePublishConfirm = async () => {
    try {
      await publishMutation.mutateAsync(offerName);
      toast.success(t`Offer published`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Failed to publish Offer`);
      throw err;
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
      throw err;
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
  const includedChargeCount = snapshots.length > 0 ? snapshots.length : refs.length;
  const canSetAsDefault = isGA && snapshots.length > 0;
  const conditions = offer.status?.conditions ?? [];
  const snapshotPending = isGA && !offer.status?.publishedAt && snapshots.length === 0;

  const overviewItems = [
    {
      label: t`ID`,
      value: <span className="font-mono text-xs">{offer.metadata?.name ?? '—'}</span>,
    },
    {
      label: t`Display name`,
      value: (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{displayName || '—'}</span>
          {isGA ? (
            <Button
              type="tertiary"
              theme="borderless"
              icon={<ACTION_ICONS.edit size={14} />}
              onClick={() => setDisplayNameDialogOpen(true)}>
              <Trans>Edit</Trans>
            </Button>
          ) : null}
        </div>
      ),
    },
    {
      label: t`Launch stage`,
      value: launchStage ? (
        <BadgeState state={launchStage} message={formatLaunchStage(launchStage)} />
      ) : (
        '—'
      ),
    },
    {
      label: t`Charge types`,
      value: formatChargeTypes(offer.spec?.chargeTypes ?? []) || '—',
    },
    {
      label: t`Included charges`,
      value: includedChargeCount > 0 ? includedChargeCount : '—',
    },
    {
      label: t`Created`,
      value: offer.metadata?.creationTimestamp ? (
        <DateTime date={offer.metadata.creationTimestamp} variant="both" addSuffix />
      ) : (
        '—'
      ),
    },
    {
      label: t`Published at`,
      value: offer.status?.publishedAt ? (
        <DateTime date={offer.status.publishedAt} variant="both" addSuffix />
      ) : snapshotPending ? (
        <span className="text-muted-foreground text-xs">
          <Trans>Pending snapshot</Trans>
        </span>
      ) : (
        '—'
      ),
    },
  ];

  if (conditions.length > 0) {
    overviewItems.push({
      label: t`Status`,
      value: <BadgeCondition status={offer.status} multiple />,
    });
  }

  if (isGA) {
    overviewItems.push({
      label: t`Platform default`,
      value: defaultOffer.isLoading
        ? t`Loading…`
        : defaultOffer.isError
          ? t`Unavailable`
          : defaultOffer.isDefault
            ? t`Yes — new accounts use this Offer`
            : defaultOffer.currentDefault
              ? t`No — current default is ${defaultOffer.currentDefault}`
              : t`No — none configured`,
    });
  }

  const draftOverviewItems = overviewItems.filter(
    (item) => item.label !== t`Included charges` && item.label !== t`Status`
  );

  return (
    <div className="m-4 space-y-3">
      <PageHeader
        title={displayName}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <Text size="sm" className="text-muted-foreground">
              {offer.metadata?.name}
            </Text>
            <BadgeState
              state={launchStage || 'Unknown'}
              message={launchStage ? formatLaunchStage(launchStage) : undefined}
            />
            {defaultOffer.isDefault ? <BadgeState state="Default" /> : null}
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isDraft ? (
              <Button
                type="primary"
                onClick={() => setPublishConfirmOpen(true)}
                disabled={(offer.spec?.servicePricingRefs ?? []).length === 0}>
                <Trans>Publish</Trans>
              </Button>
            ) : (
              <DefaultOfferHeaderActions offerName={offerName} canSetAsDefault={canSetAsDefault} />
            )}
          </div>
        }
      />

      {isDraft ? (
        <>
          <SectionCard title={<Trans>Overview</Trans>} contentClassName="pt-3">
            <DescriptionList items={draftOverviewItems} labelWidth="7.5rem" />
            <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
              <Trans>
                Publish to GA before this Offer can be set as the platform default for new billing
                accounts.
              </Trans>
            </p>
          </SectionCard>
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
        </>
      ) : (
        <SectionCard title={<Trans>Offer details</Trans>} contentClassName="pt-3">
          <Row type="flex" gutter={[24, 24]}>
            <Col span={24} xl={7}>
              <DescriptionList items={overviewItems} labelWidth="6.75rem" />
            </Col>
            <Col span={24} xl={17}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <Text size="sm" weight="medium">
                  <Trans>Included charges</Trans>
                  {includedChargeCount > 0 ? (
                    <span className="text-muted-foreground ml-1 font-normal">
                      ({includedChargeCount})
                    </span>
                  ) : null}
                </Text>
                {snapshotPending ? (
                  <Text size="xs" className="text-muted-foreground">
                    <Trans>Snapshot not written yet — controller may still be reconciling.</Trans>
                  </Text>
                ) : null}
              </div>
              <OfferIncludedPricingList
                snapshots={snapshots}
                refs={refs}
                pricings={pricings}
                isLoading={pricingsQuery.isLoading}
                variant="table"
              />
            </Col>
          </Row>
        </SectionCard>
      )}

      <DialogConfirm
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title={t`Publish Offer`}
        description={t`Publishing snapshots rates into this Offer. After GA the rates are immutable; create a new Offer version to change pricing.`}
        confirmText={t`Publish`}
        cancelText={t`Cancel`}
        onConfirm={handlePublishConfirm}
      />

      <DialogForm
        key={displayName}
        open={displayNameDialogOpen}
        onOpenChange={setDisplayNameDialogOpen}
        title={t`Edit display name`}
        description={t`After publish, only the display name can change. Rate changes need a new Offer.`}
        schema={displayNameSchema}
        defaultValues={{ displayName }}
        submitText={t`Save`}
        cancelText={t`Cancel`}
        onSubmit={handleDisplayNameSubmit}>
        <Form.Field name="displayName" label={t`Display name`} required>
          <Form.Input />
        </Form.Field>
      </DialogForm>
    </div>
  );
}

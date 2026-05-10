import type { Route } from './+types/detail';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { Pills, VendorFormDialog } from '@/features/compliance';
import { useDeleteVendorMutation, useVendorDetailQuery } from '@/resources/request/client';
import { complianceRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ArrowLeft, EditIcon, ExternalLinkIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Vendor`);
};

const RISK_TIER_BADGE: Record<string, 'info' | 'warning' | 'error' | 'active'> = {
  Low: 'info',
  Medium: 'active',
  High: 'warning',
  Critical: 'error',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <Text size="xs" textColor="muted" weight="medium" className="tracking-wide uppercase">
        {label}
      </Text>
      <div className="mt-1">{value}</div>
    </div>
  );
}

export default function Page() {
  const navigate = useNavigate();
  const { vendorName } = useParams();
  const vendorQuery = useVendorDetailQuery(vendorName ?? '');
  const deleteVendorMutation = useDeleteVendorMutation();
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const vendor = vendorQuery.data;

  if (vendorQuery.isLoading) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Text size="sm" textColor="muted">
            <Trans>Loading vendor...</Trans>
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (!vendor) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Text size="sm" textColor="muted">
            <Trans>Vendor not found.</Trans>
          </Text>
        </CardContent>
      </Card>
    );
  }

  const profile = vendor.spec?.complianceProfile;
  const subprocessorRef = vendor.status?.subprocessorRef;

  return (
    <div className="m-4 space-y-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          to={complianceRoutes.vendors.list()}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-3 w-3" />
          <Trans>Back to vendors</Trans>
        </Link>
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{vendor.spec?.displayName}</CardTitle>
                <Text size="sm" textColor="muted" className="mt-1">
                  {vendor.metadata?.name}
                </Text>
              </div>
              <div className="flex gap-2">
                <Button
                  type="secondary"
                  icon={<EditIcon size={16} />}
                  onClick={() => setShowEdit(true)}>
                  <Trans>Edit</Trans>
                </Button>
                <Button
                  type="danger"
                  theme="outline"
                  icon={<Trash2Icon size={16} />}
                  onClick={() => setShowDelete(true)}>
                  <Trans>Delete</Trans>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field
              label={t`Legal Entity`}
              value={<Text size="sm">{vendor.spec?.legalEntity}</Text>}
            />
            <Field
              label={t`Country of Incorporation`}
              value={<Text size="sm">{vendor.spec?.countryOfIncorporation}</Text>}
            />
            <Field
              label={t`Website`}
              value={
                vendor.spec?.website ? (
                  <a
                    href={vendor.spec.website}
                    className="inline-flex items-center gap-1 text-sm hover:underline"
                    target="_blank"
                    rel="noreferrer">
                    {vendor.spec.website}
                    <Icon icon={ExternalLinkIcon} size={12} />
                  </a>
                ) : (
                  <Text size="sm" textColor="muted">
                    -
                  </Text>
                )
              }
            />
            <Field
              label={t`Created`}
              value={<DateTime date={vendor.metadata?.creationTimestamp} className="text-sm" />}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>
              <Trans>Compliance Profile</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profile ? (
              <Text size="sm" textColor="muted">
                <Trans>This vendor does not process personal data on Datum&apos;s behalf.</Trans>
              </Text>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={t`Phase`}
                  value={
                    <BadgeState
                      state={profile.phase === 'Active' ? 'active' : 'info'}
                      message={profile.phase}
                    />
                  }
                />
                <Field
                  label={t`Risk Tier`}
                  value={
                    <BadgeState
                      state={RISK_TIER_BADGE[profile.riskTier] ?? 'info'}
                      message={profile.riskTier}
                    />
                  }
                />
                <Field
                  label={t`Transfer Mechanism`}
                  value={<Text size="sm">{profile.transferMechanism}</Text>}
                />
                <Field
                  label={t`Effective Date`}
                  value={
                    profile.effectiveDate ? (
                      <DateTime
                        date={profile.effectiveDate}
                        format="d MMM, yyyy"
                        variant="absolute"
                        showTooltip
                        className="text-sm"
                      />
                    ) : (
                      <Text size="sm" textColor="muted">
                        -
                      </Text>
                    )
                  }
                />
                <Field
                  label={t`Data Categories`}
                  value={<Pills values={profile.dataCategories} />}
                />
                <Field
                  label={t`Data Subject Types`}
                  value={<Pills values={profile.dataSubjectTypes} />}
                />
                <Field
                  label={t`Processing Regions`}
                  value={<Pills values={profile.processingRegions} />}
                />
                <Field
                  label={t`DPA Reference`}
                  value={
                    profile.dpaReference ? (
                      <a
                        href={profile.dpaReference}
                        className="inline-flex items-center gap-1 text-sm hover:underline"
                        target="_blank"
                        rel="noreferrer">
                        {profile.dpaReference}
                        <Icon icon={ExternalLinkIcon} size={12} />
                      </a>
                    ) : (
                      <Text size="sm" textColor="muted">
                        <Trans>Missing</Trans>
                      </Text>
                    )
                  }
                />
                <div className="col-span-2">
                  <Field label={t`Purpose`} value={<Text size="sm">{profile.purpose}</Text>} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {subprocessorRef && (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>
                <Trans>Public Disclosure</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text size="sm">
                <Trans>This vendor is published as a subprocessor:</Trans>{' '}
                <Link
                  to={complianceRoutes.subprocessors.detail(subprocessorRef)}
                  className="text-blue-600 hover:underline">
                  {subprocessorRef}
                </Link>
              </Text>
            </CardContent>
          </Card>
        )}
      </div>

      <VendorFormDialog open={showEdit} onOpenChange={setShowEdit} vendor={vendor} />

      <DialogConfirm
        open={showDelete}
        onOpenChange={setShowDelete}
        title={t`Delete Vendor`}
        description={t`Are you sure you want to delete vendor "${vendor.metadata?.name ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await deleteVendorMutation.mutateAsync(vendor.metadata?.name ?? '');
          toast.success(t`Vendor deleted successfully`);
          navigate(complianceRoutes.vendors.list());
        }}
      />
    </div>
  );
}

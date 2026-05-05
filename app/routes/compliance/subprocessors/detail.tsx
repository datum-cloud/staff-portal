import type { Route } from './+types/detail';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { Pills } from '@/features/compliance';
import { useSubprocessorDetailQuery } from '@/resources/request/client';
import { complianceRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Subprocessor`);
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
  const { subprocessorName } = useParams();
  const subprocessorQuery = useSubprocessorDetailQuery(subprocessorName ?? '');
  const subprocessor = subprocessorQuery.data;

  if (subprocessorQuery.isLoading) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Text size="sm" textColor="muted">
            <Trans>Loading subprocessor...</Trans>
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (!subprocessor) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Text size="sm" textColor="muted">
            <Trans>Subprocessor not found.</Trans>
          </Text>
        </CardContent>
      </Card>
    );
  }

  const disclosure = subprocessor.status?.disclosure;
  const vendorRef = subprocessor.spec?.vendorRef;

  return (
    <div className="m-4 space-y-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          to={complianceRoutes.subprocessors.list()}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-3 w-3" />
          <Trans>Back to subprocessors</Trans>
        </Link>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{subprocessor.metadata?.name}</CardTitle>
            {vendorRef && (
              <Text size="sm" textColor="muted" className="mt-1">
                <Trans>Derived from vendor</Trans>{' '}
                <Link
                  to={complianceRoutes.vendors.detail(vendorRef)}
                  className="text-blue-600 hover:underline">
                  {vendorRef}
                </Link>
              </Text>
            )}
          </CardHeader>
          <CardContent>
            {!disclosure ? (
              <Text size="sm" textColor="muted">
                <Trans>No disclosure data available yet.</Trans>
              </Text>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={t`Display Name`}
                  value={<Text size="sm">{disclosure.displayName}</Text>}
                />
                <Field
                  label={t`Legal Entity`}
                  value={<Text size="sm">{disclosure.legalEntity}</Text>}
                />
                <Field
                  label={t`Country of Incorporation`}
                  value={<Text size="sm">{disclosure.countryOfIncorporation}</Text>}
                />
                <Field
                  label={t`Phase`}
                  value={
                    <BadgeState
                      state={disclosure.phase === 'Active' ? 'active' : 'info'}
                      message={disclosure.phase}
                    />
                  }
                />
                <Field
                  label={t`Transfer Mechanism`}
                  value={<Text size="sm">{disclosure.transferMechanism}</Text>}
                />
                <Field
                  label={t`Effective Date`}
                  value={
                    disclosure.effectiveDate ? (
                      <DateTime date={disclosure.effectiveDate} format="d MMM, yyyy" />
                    ) : (
                      <Text size="sm" textColor="muted">
                        -
                      </Text>
                    )
                  }
                />
                <Field
                  label={t`Website`}
                  value={
                    disclosure.website ? (
                      <a
                        href={disclosure.website}
                        className="text-sm text-blue-600 hover:underline"
                        target="_blank"
                        rel="noreferrer">
                        {disclosure.website}
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
                  value={<DateTime date={subprocessor.metadata?.creationTimestamp} />}
                />
                <Field
                  label={t`Data Categories`}
                  value={<Pills values={disclosure.dataCategories} />}
                />
                <Field
                  label={t`Processing Regions`}
                  value={<Pills values={disclosure.processingRegions} />}
                />
                <div className="col-span-2">
                  <Field label={t`Purpose`} value={<Text size="sm">{disclosure.purpose}</Text>} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

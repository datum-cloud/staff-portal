import type { Route } from './+types/detail';
import { PageHeader } from '@/components/page-header';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useParams } from 'react-router';

export const meta: Route.MetaFunction = () => metaObject(t`Domain`);

export const handle = {
  breadcrumb: () => <Trans>Detail</Trans>,
};

export default function Page() {
  const { domainName } = useParams();

  return (
    <div className="m-4 flex flex-col gap-1">
      <PageHeader title={domainName ?? t`Domain`} />
      <Card className="mt-4 shadow-none">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Text size="lg" weight="semibold">
            <Trans>Coming soon</Trans>
          </Text>
          <Text size="sm" textColor="muted">
            <Trans>
              A global domain detail page is on the way. For now, open a domain from its project to
              see full details.
            </Trans>
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}

import type { Route } from './+types/detail';
import { PageHeader } from '@/components/page-header';
import {
  EdgeAdvancedBanner,
  EdgeConfigCard,
  EdgeGeneralCard,
  EdgeHostnamesCard,
  EdgeOriginsCard,
  EdgeYamlCard,
} from '@/features/edge/components/detail';
import type { EdgeDetailBundle } from '@/features/edge/lib';
import { authenticator } from '@/modules/auth';
import { projectEdgeDetailBundleQuery } from '@/resources/request/server';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<EdgeDetailBundle>(matches);
  const title = data?.proxy?.chosenName || data?.proxy?.name;
  return metaObject(`AI Edge - ${title}`);
};

export const handle = {
  breadcrumb: (data: EdgeDetailBundle) => <span>{data?.proxy?.name ?? ''}</span>,
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  return projectEdgeDetailBundleQuery(
    session?.accessToken ?? '',
    params?.projectName ?? '',
    params?.edgeName ?? ''
  );
};

export default function Page() {
  const { raw, proxy } = useLoaderData<typeof loader>();
  const displayName = proxy.chosenName || proxy.name;

  return (
    <div className="m-4 flex flex-col gap-4">
      <PageHeader
        title={displayName}
        description={
          proxy.chosenName ? (
            <Text textColor="muted">
              <Trans>Resource:</Trans> {proxy.name}
            </Text>
          ) : undefined
        }
      />

      {proxy.complexity === 'advanced' && <EdgeAdvancedBanner />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EdgeGeneralCard proxy={proxy} />
        <EdgeConfigCard proxy={proxy} />
        <EdgeHostnamesCard proxy={proxy} />
        <EdgeOriginsCard proxy={proxy} />
      </div>

      <EdgeYamlCard raw={raw} />
    </div>
  );
}

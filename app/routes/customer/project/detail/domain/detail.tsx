import type { Route } from './+types/detail';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayText } from '@/components/display';
import { PageHeader } from '@/components/page-header';
import { DomainDnsProviders, DomainExpiration, DomainStatusProbe } from '@/features/domain';
import { SectionCard } from '@/features/milo';
import { NotesCard } from '@/features/notes';
import { authenticator } from '@/modules/auth';
import { projectDomainDetailQuery } from '@/resources/request/server';
import { useProjectDetailData } from '@/routes/customer/project/shared';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';
import { useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<ComDatumapisNetworkingV1AlphaDomain>(matches);
  return metaObject(`Domain - ${data?.spec?.domainName}`);
};

export const handle = {
  breadcrumb: (loaderData: { data: ComDatumapisNetworkingV1AlphaDomain }) => (
    <span>{loaderData?.data?.spec?.domainName}</span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const data = await projectDomainDetailQuery(
    session?.accessToken ?? '',
    params?.projectName ?? '',
    params?.domainName ?? '',
    params?.namespace as string
  );

  return { data };
};

export default function Page() {
  const { project } = useProjectDetailData();
  const { data } = useLoaderData<typeof loader>();

  return (
    <div className="m-4 flex flex-col gap-1">
      <PageHeader title={data?.spec?.domainName} />

      <SectionCard className="mt-4">
        <DescriptionList
          items={[
            {
              label: <Trans>Resource Name</Trans>,
              value: (
                <Text>
                  <DisplayText value={data?.metadata?.name ?? ''} withCopy />
                </Text>
              ),
            },
            {
              label: <Trans>Namespace</Trans>,
              value: <Text>{data?.metadata?.namespace ?? ''}</Text>,
            },
            {
              label: <Trans>Domain</Trans>,
              value: <Text>{data?.spec?.domainName}</Text>,
            },
            {
              label: <Trans>Registrar</Trans>,
              value: <Text>{data?.status?.registration?.registrar?.name}</Text>,
            },
            {
              label: <Trans>DNS Providers</Trans>,
              value: <DomainDnsProviders nameservers={data?.status?.nameservers} maxVisible={2} />,
            },
            {
              label: <Trans>Expiration Date</Trans>,
              value: <DomainExpiration expiresAt={data?.status?.registration?.expiresAt} />,
            },
            {
              label: <Trans>Status</Trans>,
              value: (
                <DomainStatusProbe
                  projectName={project.metadata?.name ?? ''}
                  domainName={data?.metadata?.name ?? ''}
                  namespace={data?.metadata?.namespace ?? ''}
                />
              ),
            },
            {
              label: <Trans>Created</Trans>,
              value: (
                <Text>
                  <DateTime date={data?.metadata?.creationTimestamp} variant="both" />
                </Text>
              ),
            },
          ]}
        />
      </SectionCard>

      <NotesCard
        className="mt-4"
        subject={{
          apiGroup: 'networking.datumapis.com',
          kind: 'Domain',
          name: data?.metadata?.name ?? '',
          namespace: data?.metadata?.namespace ?? '',
        }}
        scope={{ kind: 'project', projectName: project.metadata?.name ?? '' }}
      />
    </div>
  );
}

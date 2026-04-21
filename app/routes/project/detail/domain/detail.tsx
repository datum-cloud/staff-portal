import type { Route } from './+types/detail';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayText } from '@/components/display';
import { PageHeader } from '@/components/page-header';
import {
  CreateNoteForm,
  DomainDnsProviders,
  DomainExpiration,
  DomainStatusProbe,
  NotesList,
} from '@/features/domain';
import { authenticator } from '@/modules/auth';
import {
  projectDomainDetailQuery,
  projectDomainNotesQuery,
  userDetailQuery,
} from '@/resources/request/server';
import { useProjectDetailData } from '@/routes/project/shared';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';
import { useLoaderData, useRevalidator } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<ComDatumapisNetworkingV1AlphaDomain>(matches);
  return metaObject(`Domain - ${data?.spec?.domainName}`);
};

export const handle = {
  breadcrumb: (data: ComDatumapisNetworkingV1AlphaDomain) => <span>{data?.spec?.domainName}</span>,
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const [data, notes] = await Promise.all([
    projectDomainDetailQuery(
      session?.accessToken ?? '',
      params?.projectName ?? '',
      params?.domainName ?? '',
      params?.namespace as string
    ),
    projectDomainNotesQuery(
      session?.accessToken ?? '',
      params?.projectName ?? '',
      params?.domainName ?? '',
      params?.namespace as string
    ).catch(() => null),
  ]);

  const creatorIds = [
    ...new Set(
      (notes?.items ?? []).map((n) => n.spec?.creatorRef?.name).filter((id): id is string => !!id)
    ),
  ];

  const userEmails = Object.fromEntries(
    await Promise.all(
      creatorIds.map(async (id) => {
        try {
          const user = await userDetailQuery(session?.accessToken ?? '', id);
          return [id, user?.spec?.email ?? id] as [string, string];
        } catch {
          return [id, id] as [string, string];
        }
      })
    )
  );

  return { data, notes, userEmails };
};

export default function Page() {
  const { project } = useProjectDetailData();
  const { data, notes, userEmails } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  return (
    <div className="m-4 flex flex-col gap-1">
      <PageHeader title={data?.spec?.domainName} />

      <Card className="mt-4 shadow-none">
        <CardContent>
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
                value: (
                  <DomainDnsProviders nameservers={data?.status?.nameservers} maxVisible={2} />
                ),
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
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>Notes</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <NotesList
            notes={notes}
            projectName={project.metadata?.name ?? ''}
            namespace={data?.metadata?.namespace ?? ''}
            userEmails={userEmails}
            onNoteDeleted={revalidate}
          />
          <CreateNoteForm
            projectName={project.metadata?.name ?? ''}
            namespace={data?.metadata?.namespace ?? ''}
            domainName={data?.metadata?.name ?? ''}
            onCreated={revalidate}
          />
        </CardContent>
      </Card>
    </div>
  );
}

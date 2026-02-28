import type { Route } from './+types/detail';
import { DateTime } from '@/components/date';
import { DisplayText } from '@/components/display';
import {
  CreateNoteForm,
  DomainDnsProviders,
  DomainExpiration,
  DomainStatusProbe,
  NotesList,
} from '@/features/domain';
import { authenticator } from '@/modules/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import {
  projectDomainDetailQuery,
  projectDomainNotesQuery,
  userDetailQuery,
} from '@/resources/request/server';
import { useProjectDetailData } from '@/routes/project/shared';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Text, Title } from '@datum-ui/typography';
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
      <Title>{data?.spec?.domainName}</Title>

      <Card className="mt-4 shadow-none">
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Resource Name</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>
                    <DisplayText value={data?.metadata?.name ?? ''} withCopy />
                  </Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Namespace</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.metadata?.namespace ?? ''}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Domain</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.spec?.domainName}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Registrar</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.status?.registration?.registrar?.name}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>DNS Providers</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <DomainDnsProviders nameservers={data?.status?.nameservers} maxVisible={2} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Expiration Date</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <DomainExpiration expiresAt={data?.status?.registration?.expiresAt} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Status</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <DomainStatusProbe
                    projectName={project.metadata?.name ?? ''}
                    domainName={data?.metadata?.name ?? ''}
                    namespace={data?.metadata?.namespace ?? ''}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Created</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>
                    <DateTime date={data?.metadata?.creationTimestamp} variant="both" />
                  </Text>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
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

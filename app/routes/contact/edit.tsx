import type { Route } from './+types/edit';
import { ContactDetailLoaderData, getContactDetailMetadata, useContactDetailData } from './shared';
import { ContactForm } from '@/features/contact';
import { AddNoteDialog, ShowNotesDialog } from '@/features/note';
import { authenticator } from '@/modules/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { contactDetailQuery, userDetailQuery } from '@/resources/request/server';
import { User } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-ui/grid';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Edit - ${contactName}`);
};

export const handle = {
  breadcrumb: (data: ContactDetailLoaderData) => {
    const displayName = [data.contact?.spec?.givenName, data.contact?.spec?.familyName]
      .filter(Boolean)
      .join(' ');
    const contactName = data.contact?.metadata?.name ?? '';

    return <span>{displayName || contactName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const contact = await contactDetailQuery(
    session?.accessToken ?? '',
    params?.contactName ?? '',
    params?.namespace ?? ''
  );

  let user: User | undefined;
  if (contact?.spec?.subject?.name && contact?.spec?.subject?.kind === 'User') {
    user = await userDetailQuery(session?.accessToken ?? '', contact?.spec?.subject?.name ?? '');
  }

  return { contact, user };
};

export default function Page() {
  const data = useContactDetailData();
  const [noteRefreshTrigger, setNoteRefreshTrigger] = useState(0);

  const handleNoteCreated = () => {
    setNoteRefreshTrigger((prev) => prev + 1);
  };

  const subjectRef = data?.contact
    ? {
        apiGroup: 'notification_miloapis_com' as const,
        kind: 'Contact' as const,
        name: data.contact.metadata.name,
        namespace: data.contact.metadata.namespace,
      }
    : null;

  return (
    <div className="m-4">
      <Row className="mb-4">
        <Col span={12} offset={6}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                <Trans>Contact Information</Trans>
              </CardTitle>
              {subjectRef && (
                <div className="flex items-center gap-2">
                  <ShowNotesDialog subjectRef={subjectRef} refreshTrigger={noteRefreshTrigger} />
                  <div className="bg-border h-6 w-px" />
                  <AddNoteDialog subjectRef={subjectRef} onSuccess={handleNoteCreated} />
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ContactForm contact={data?.contact} user={data?.user} />
            </CardContent>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

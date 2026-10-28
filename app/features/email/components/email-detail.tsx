import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import {
  extractTemplateName,
  getEmailCondition,
  normalizeBody,
} from '@/features/email/email-utils';
import { startCase } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Table, TableBody, TableCell, TableRow } from '@datum-cloud/datum-ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@datum-cloud/datum-ui/tabs';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisNotificationV1Alpha1Email } from '@openapi/notification.miloapis.com/v1alpha1';

interface EmailDetailProps {
  email: ComMiloapisNotificationV1Alpha1Email | null;
}

export function EmailDetail({ email }: EmailDetailProps) {
  if (!email) return null;

  const recipient = email.status?.emailAddress || email.spec?.recipient?.emailAddress || '-';
  const subject = email.status?.subject || '-';
  const condition = getEmailCondition(email);
  const templateRef = email.spec?.templateRef?.name;
  const templateName = templateRef ? extractTemplateName(templateRef) : '-';
  const priority = email.spec?.priority ?? '-';
  const providerId = email.status?.providerID ?? '-';
  const sentAt = email.metadata?.creationTimestamp;

  const textBody = normalizeBody(email.status?.textBody);
  const htmlBody = normalizeBody(email.status?.htmlBody);

  return (
    <div className="m-4 flex flex-col gap-4">
      <Title level={1}>{recipient}</Title>

      <Card className="shadow-none">
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Subject</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{subject}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Status</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <BadgeState
                    state={condition?.status?.toLowerCase() ?? ''}
                    message={startCase(condition?.reason ?? '')}
                    tooltip={condition?.message}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Template</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{templateName}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Sent</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>
                    <DateTime date={sentAt} variant="both" />
                  </Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Priority</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text className="capitalize">{priority}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Provider ID</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{providerId}</Text>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent>
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full max-w-[360px] grid-cols-3">
              <TabsTrigger value="preview">{t`Preview`}</TabsTrigger>
              <TabsTrigger value="plain">{t`Plain Text`}</TabsTrigger>
              <TabsTrigger value="html">{t`HTML`}</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-4">
              <div className="bg-muted/30 rounded-md border p-3">
                {htmlBody ? (
                  <iframe
                    srcDoc={htmlBody}
                    className="h-[60vh] w-full border-0"
                    sandbox="allow-same-origin"
                    title={t`Email HTML preview`}
                  />
                ) : (
                  <pre className="muted-foreground text-sm break-words whitespace-pre-wrap">-</pre>
                )}
              </div>
            </TabsContent>
            <TabsContent value="plain" className="mt-4">
              <div className="bg-muted/30 max-h-[60vh] overflow-auto rounded-md border p-3">
                <pre className="text-sm break-words whitespace-pre-wrap">{textBody || '-'}</pre>
              </div>
            </TabsContent>
            <TabsContent value="html" className="mt-4">
              <div className="bg-muted/30 max-h-[60vh] overflow-auto rounded-md border p-3">
                <pre className="text-sm break-words whitespace-pre-wrap">{htmlBody || '-'}</pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

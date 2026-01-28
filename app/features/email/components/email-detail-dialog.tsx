import { extractTemplateName, normalizeBody } from '@/features/email/email-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/modules/shadcn/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/modules/shadcn/ui/tabs';
import { Button } from '@datum-ui/button';
import { Col, Row } from '@datum-ui/grid';
import { Text } from '@datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisNotificationV1Alpha1Email } from '@openapi/notification.miloapis.com/v1alpha1';

interface EmailDetailDialogProps {
  open: boolean;
  email: ComMiloapisNotificationV1Alpha1Email | null;
  onOpenChange: (open: boolean) => void;
}

export function EmailDetailDialog({ open, email, onOpenChange }: EmailDetailDialogProps) {
  const subject = email?.status?.subject;
  const textBody = normalizeBody(email?.status?.textBody);
  const htmlBody = normalizeBody(email?.status?.htmlBody);
  const templateRef = email?.spec?.templateRef?.name;
  const recipient = email?.status?.emailAddress || email?.spec?.recipient?.emailAddress || '-';

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t`Email details`}</DialogTitle>
          <DialogDescription>
            {templateRef ? extractTemplateName(templateRef) : '-'} · {recipient}
          </DialogDescription>
        </DialogHeader>

        <Row gutter={12}>
          <Col span={24}>
            <div className="space-y-1">
              <Text size="sm" textColor="muted">
                <Trans>Subject: </Trans>
              </Text>
              <Text size="sm">{subject || '-'}</Text>
            </div>
          </Col>

          <Col span={24} className="mt-4">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-[240px] grid-cols-2">
                <TabsTrigger value="text">{t`Text`}</TabsTrigger>
                <TabsTrigger value="html">{t`HTML`}</TabsTrigger>
              </TabsList>
              <TabsContent value="text">
                <div className="bg-muted/30 max-h-[50vh] overflow-auto rounded-md border p-3">
                  <pre className="text-sm break-words whitespace-pre-wrap">{textBody || '-'}</pre>
                </div>
              </TabsContent>
              <TabsContent value="html">
                <div className="bg-muted/30 rounded-md border p-3">
                  {htmlBody ? (
                    <iframe
                      srcDoc={htmlBody}
                      className="h-[50vh] w-full border-0"
                      sandbox="allow-same-origin"
                      title={t`Email HTML preview`}
                    />
                  ) : (
                    <pre className="max-h-[50vh] text-sm break-words whitespace-pre-wrap">-</pre>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Col>
        </Row>

        <DialogFooter>
          <Button type="secondary" theme="outline" onClick={() => onOpenChange(false)}>
            {t`Close`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

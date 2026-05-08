import { useCreateKbEntryMutation } from '@/resources/request/client/queries/support.queries';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Input } from '@datum-cloud/datum-ui/input';
import { Label } from '@datum-cloud/datum-ui/label';
import { Textarea } from '@datum-cloud/datum-ui/textarea';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import type { ComMiloApisSupportV1Alpha1UserReference } from '@openapi/support.miloapis.com/v1alpha1';
import { useState } from 'react';

interface PromoteToKbDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceMessageRef: string;
  initialBody: string;
  authorRef: ComMiloApisSupportV1Alpha1UserReference;
}

export function PromoteToKbDialog({
  open,
  onOpenChange,
  sourceMessageRef,
  initialBody,
  authorRef,
}: PromoteToKbDialogProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(initialBody);
  const [topic, setTopic] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const createKbEntry = useCreateKbEntryMutation();

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await createKbEntry.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        topic: topic.trim() || undefined,
        tags: tags.length ? tags : undefined,
        authorRef,
        sourceMessageRef,
      });
      toast.success(t`Knowledge base entry saved`);
      onOpenChange(false);
      setTitle('');
      setTopic('');
      setTagsInput('');
    } catch {
      toast.error(t`Failed to save knowledge base entry`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-2xl">
        <Dialog.Header title={t`Promote to Knowledge Base`} />
        <Dialog.Body className="space-y-4 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="kb-title">{t`Title`}</Label>
            <Input
              id="kb-title"
              placeholder={t`Entry title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kb-body">{t`Body`}</Label>
            <Textarea
              id="kb-body"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="kb-topic">{t`Topic`}</Label>
              <Input
                id="kb-topic"
                placeholder={t`e.g. Billing, Networking`}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-tags">{t`Tags`}</Label>
              <Input
                id="kb-tags"
                placeholder={t`Comma-separated tags`}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer className="gap-2">
          <Button
            type="tertiary"
            theme="borderless"
            htmlType="button"
            onClick={() => onOpenChange(false)}>
            {t`Cancel`}
          </Button>
          <Button
            type="primary"
            theme="solid"
            htmlType="button"
            loading={createKbEntry.isPending}
            disabled={createKbEntry.isPending || !title.trim() || !body.trim()}
            onClick={handleSubmit}>
            {t`Save to Knowledge Base`}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

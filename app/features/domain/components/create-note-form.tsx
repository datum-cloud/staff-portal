import { noteCreateMutation } from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Textarea } from '@datum-cloud/datum-ui/textarea';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';

interface CreateNoteFormProps {
  projectName: string;
  namespace: string;
  domainName: string;
  onCreated: () => void;
}

export function CreateNoteForm({
  projectName,
  namespace,
  domainName,
  onCreated,
}: CreateNoteFormProps) {
  const { t } = useLingui();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await noteCreateMutation(projectName, namespace, domainName, content.trim());
      setContent('');
      onCreated();
      toast.success(t`Note added`);
    } catch {
      // Error toast is handled by the axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="note-content">
        <Text>
          <Trans>Add a note</Trans>
        </Text>
      </label>
      <Textarea
        id="note-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t`Enter note content...`}
        rows={4}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <Text size="xs" textColor={content.length > 1000 ? 'destructive' : 'muted'}>
          {content.length}/1000
        </Text>
        <Button
          htmlType="submit"
          disabled={content.trim().length === 0 || content.length > 1000 || isSubmitting}
          loading={isSubmitting}>
          <Trans>Add Note</Trans>
        </Button>
      </div>
    </form>
  );
}

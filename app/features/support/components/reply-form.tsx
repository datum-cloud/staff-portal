import { MarkdownEditor } from '@/components/markdown-editor';
import {
  useCreateMessageMutation,
  useUpdateTicketLastActivityMutation,
} from '@/resources/request/client/queries/support.queries';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';

interface ReplyFormProps {
  ticketName: string;
  authorRef: { name: string; displayName?: string; email?: string };
}

export function ReplyForm({ ticketName, authorRef }: ReplyFormProps) {
  const { t } = useLingui();
  const [isInternal, setIsInternal] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const createMessage = useCreateMessageMutation(ticketName);
  const updateLastActivity = useUpdateTicketLastActivityMutation();

  const doSubmit = async () => {
    if (!body.trim()) {
      toast.error(t`Reply cannot be empty`);
      return;
    }
    setSubmitting(true);
    try {
      await createMessage.mutateAsync({
        body: body.trim(),
        authorRef,
        internal: isInternal,
      });
      if (!isInternal) updateLastActivity.mutate(ticketName);
      toast.success(isInternal ? t`Internal note added` : t`Reply sent`);
      setBody('');
    } catch {
      toast.error(t`Failed to send reply`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    doSubmit();
  };

  return (
    <div className="border-t p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <MarkdownEditor
          value={body}
          onChange={setBody}
          onSubmit={doSubmit}
          disabled={submitting || createMessage.isPending}
          placeholder={isInternal ? t`Write an internal note...` : t`Write a reply...`}
        />
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isInternal} onCheckedChange={(v) => setIsInternal(v === true)} />
            <span className="text-muted-foreground">
              <Trans>Staff-only note (not visible to customer)</Trans>
            </span>
          </label>
          <button
            type="submit"
            disabled={submitting || createMessage.isPending}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-50 ${isInternal ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-primary'}`}>
            {submitting || createMessage.isPending
              ? t`Sending...`
              : isInternal
                ? t`Add note`
                : t`Send reply`}
          </button>
        </div>
      </form>
    </div>
  );
}

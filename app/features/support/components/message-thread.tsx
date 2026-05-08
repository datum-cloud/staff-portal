import { PromoteToKbDialog } from './promote-to-kb-dialog';
import { DateTime } from '@/components/date';
import { MarkdownBody } from '@/components/markdown-body';
import { MarkdownEditor } from '@/components/markdown-editor';
import { useApp } from '@/providers/app.provider';
import {
  useMessageListQuery,
  useUpdateMessageMutation,
} from '@/resources/request/client/queries/support.queries';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { useState } from 'react';

function EditableMessage({
  name,
  body,
  ticketName,
}: {
  name: string;
  body: string;
  ticketName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const updateMessage = useUpdateMessageMutation(ticketName);

  const save = async () => {
    if (!draft.trim()) return;
    try {
      await updateMessage.mutateAsync({ name, body: draft.trim() });
      setEditing(false);
    } catch {
      toast.error(t`Failed to save edit`);
    }
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <MarkdownEditor value={draft} onChange={setDraft} onSubmit={save} rows={4} />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={updateMessage.isPending || !draft.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow disabled:opacity-50">
            {updateMessage.isPending ? t`Saving…` : t`Save`}
          </button>
          <button
            onClick={() => {
              setDraft(body);
              setEditing(false);
            }}
            className="hover:bg-accent inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium">
            {t`Cancel`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/body relative">
      <MarkdownBody content={body} />
      <button
        onClick={() => {
          setDraft(body);
          setEditing(true);
        }}
        className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-0 right-0 hidden rounded p-0.5 group-hover/body:block"
        title="Edit message">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  );
}

function PromoteButton({
  messageName,
  messageBody,
  authorRef,
}: {
  messageName: string;
  messageBody: string;
  authorRef: { name: string; displayName?: string; email?: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-0.5"
        title={t`Promote to knowledge base`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </button>
      <PromoteToKbDialog
        open={open}
        onOpenChange={setOpen}
        sourceMessageRef={messageName}
        initialBody={messageBody}
        authorRef={authorRef}
      />
    </>
  );
}

export function MessageThread({ ticketName }: { ticketName: string }) {
  const { principalId, displayName } = useApp();
  const { data, isLoading } = useMessageListQuery(ticketName);
  const messages = [...(data?.items ?? [])].sort((a, b) => {
    const ta = a.status?.createdAt ?? a.metadata?.creationTimestamp ?? '';
    const tb = b.status?.createdAt ?? b.metadata?.creationTimestamp ?? '';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  if (isLoading)
    return <div className="text-muted-foreground py-2 text-sm">{t`Loading messages...`}</div>;
  if (!messages.length)
    return <div className="text-muted-foreground py-2 text-sm">{t`No messages yet.`}</div>;

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => {
        const isSystem = msg.spec.authorRef.name === 'system';
        const isInternal = msg.spec.internal;
        const isStaff = msg.spec.authorType === 'staff';
        const msgName = msg.metadata?.name ?? '';

        // Activity timeline event — render as a horizontal divider
        if (isSystem) {
          return (
            <div key={msgName} className="flex items-center gap-3 py-1">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground shrink-0 text-xs">
                <MarkdownBody content={msg.spec.body} />
              </span>
              <DateTime
                date={msg.status?.createdAt ?? msg.metadata?.creationTimestamp}
                className="text-muted-foreground shrink-0 text-xs"
              />
              <div className="bg-border h-px flex-1" />
            </div>
          );
        }

        return (
          <div
            key={msgName}
            className={cn(
              'rounded-lg border p-4 text-sm',
              isInternal
                ? 'border-yellow-300 bg-yellow-50'
                : isStaff
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-white'
            )}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {msg.spec.authorRef.displayName || msg.spec.authorRef.name}
                </span>
                {isInternal && (
                  <span className="rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                    {t`Staff note`}
                  </span>
                )}
                {isStaff && !isInternal && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                    {t`Staff`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <DateTime
                  date={msg.status?.createdAt ?? msg.metadata?.creationTimestamp}
                  className="text-muted-foreground text-xs"
                />
                {isStaff && (
                  <PromoteButton
                    messageName={msgName}
                    messageBody={msg.spec.body}
                    authorRef={{
                      name: principalId ?? 'staff',
                      displayName: displayName ?? undefined,
                    }}
                  />
                )}
              </div>
            </div>
            <EditableMessage name={msgName} body={msg.spec.body} ticketName={ticketName} />
          </div>
        );
      })}
    </div>
  );
}

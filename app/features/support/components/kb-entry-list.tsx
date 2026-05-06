import { DateTime } from '@/components/date';
import { MarkdownBody } from '@/components/markdown-body';
import {
  useKbEntryListQuery,
  useDeleteKbEntryMutation,
} from '@/resources/request/client/queries/support.queries';
import { Button } from '@datum-cloud/datum-ui/button';
import { Input } from '@datum-cloud/datum-ui/input';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import type { ComMiloApisSupportV1Alpha1KnowledgeBaseEntry } from '@openapi/support.miloapis.com/v1alpha1';
import { Search, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function KbEntryRow({ entry }: { entry: ComMiloApisSupportV1Alpha1KnowledgeBaseEntry }) {
  const [expanded, setExpanded] = useState(false);
  const deleteEntry = useDeleteKbEntryMutation();
  const name = entry.metadata?.name ?? '';

  const handleDelete = async () => {
    if (!confirm(t`Delete this knowledge base entry?`)) return;
    try {
      await deleteEntry.mutateAsync(name);
      toast.success(t`Entry deleted`);
    } catch {
      toast.error(t`Failed to delete entry`);
    }
  };

  return (
    <div className="rounded-lg border bg-white">
      <div
        className="flex cursor-pointer items-center gap-3 p-4"
        onClick={() => setExpanded((v) => !v)}>
        <span className="text-muted-foreground shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{entry.spec.title}</span>
            {entry.spec.topic && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {entry.spec.topic}
              </span>
            )}
            {entry.spec.tags?.map((tag) => (
              <span
                key={tag}
                className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
            <span>{entry.spec.authorRef.displayName || entry.spec.authorRef.name}</span>
            <DateTime
              date={entry.status?.createdAt ?? entry.metadata?.creationTimestamp}
              className="text-xs"
            />
          </div>
        </div>
        <Button
          type="tertiary"
          theme="borderless"
          size="small"
          htmlType="button"
          className="text-destructive hover:bg-destructive/10 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleteEntry.isPending}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {expanded && (
        <div className="border-t px-4 py-3">
          <MarkdownBody content={entry.spec.body} />
        </div>
      )}
    </div>
  );
}

export function KbEntryList() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useKbEntryListQuery();

  const entries = (data?.items ?? []).filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.spec.title.toLowerCase().includes(q) ||
      e.spec.body.toLowerCase().includes(q) ||
      e.spec.topic?.toLowerCase().includes(q) ||
      e.spec.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  // Group by topic
  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const key = entry.spec.topic || t`Uncategorized`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const topics = Object.keys(grouped).sort((a, b) => {
    if (a === t`Uncategorized`) return 1;
    if (b === t`Uncategorized`) return -1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return <div className="text-muted-foreground py-4 text-sm">{t`Loading…`}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t`Search entries…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {entries.length === 0 && (
        <div className="text-muted-foreground py-8 text-center text-sm">
          {search ? t`No entries match your search.` : t`No knowledge base entries yet.`}
        </div>
      )}

      {topics.map((topic) => (
        <div key={topic} className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {topic}
          </h3>
          {grouped[topic].map((entry) => (
            <KbEntryRow key={entry.metadata?.name} entry={entry} />
          ))}
        </div>
      ))}
    </div>
  );
}

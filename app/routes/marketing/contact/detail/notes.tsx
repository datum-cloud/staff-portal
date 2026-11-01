import { EmptyState } from '@/components/empty-state';
import { Trans } from '@lingui/react/macro';
import { StickyNote } from 'lucide-react';

// Placeholder tab — the notes + history timeline lands with its own ticket (#759).
export default function Page() {
  return (
    <div className="m-4">
      <EmptyState
        icon={StickyNote}
        title={<Trans>Notes</Trans>}
        description={
          <Trans>The notes and history timeline for this contact will appear here.</Trans>
        }
      />
    </div>
  );
}

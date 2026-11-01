import { EmptyState } from '@/components/empty-state';
import { Trans } from '@lingui/react/macro';
import { SquareActivity } from 'lucide-react';

// Placeholder tab — the contact activity feed lands with its own ticket.
export default function Page() {
  return (
    <div className="m-4">
      <EmptyState
        icon={SquareActivity}
        title={<Trans>Activity</Trans>}
        description={<Trans>Recent activity entries for this contact will appear here.</Trans>}
      />
    </div>
  );
}

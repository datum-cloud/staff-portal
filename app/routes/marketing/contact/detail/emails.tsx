import { EmptyState } from '@/components/empty-state';
import { Trans } from '@lingui/react/macro';
import { Mail } from 'lucide-react';

// Placeholder tab — the contact-scoped email list lands with its own ticket.
export default function Page() {
  return (
    <div className="m-4">
      <EmptyState
        icon={Mail}
        title={<Trans>Emails sent</Trans>}
        description={<Trans>Emails sent to this contact will appear here.</Trans>}
      />
    </div>
  );
}

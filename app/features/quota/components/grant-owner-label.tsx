import type { GrantOwner } from '../lib/quota-grants';
import { Trans } from '@lingui/react/macro';

/** Who a quota grant belongs to, in words staff can act on (#343). */
export function GrantOwnerLabel({ owner }: { owner: GrantOwner }) {
  switch (owner) {
    case 'platform':
      return <Trans>Platform default</Trans>;
    case 'gitops':
      return <Trans>Managed in GitOps</Trans>;
    case 'staff':
      return <Trans>Added by staff</Trans>;
    case 'staff-shared':
      return <Trans>Added by staff, shared</Trans>;
  }
}

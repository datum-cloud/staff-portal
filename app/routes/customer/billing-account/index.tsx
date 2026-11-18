import { BillingAccountList } from '@/features/billing';
import { ListPage } from '@/features/milo';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import type { MetaFunction } from 'react-router';

// Full-width list: no section rail, the switcher is in the search bar.
export const handle = { fullWidth: true };

export const meta: MetaFunction = () => metaObject(t`Billing Accounts`);

export default function Page() {
  return (
    <ListPage>
      <BillingAccountList />
    </ListPage>
  );
}

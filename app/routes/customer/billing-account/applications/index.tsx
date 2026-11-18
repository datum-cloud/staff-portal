import { ApplicationList } from '@/features/billing';
import { ListPage } from '@/features/milo';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import type { MetaFunction } from 'react-router';

// Full-width list: no section rail, the switcher is in the search bar.
export const handle = { fullWidth: true };

export const meta: MetaFunction = () => metaObject(t`Payment Terms Applications`);

export default function Page() {
  return (
    <ListPage>
      <ApplicationList />
    </ListPage>
  );
}

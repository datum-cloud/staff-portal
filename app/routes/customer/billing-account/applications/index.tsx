import { ApplicationList } from '@/features/billing';
import { ListPage } from '@/features/milo';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = () => metaObject(t`Payment Terms Applications`);

export default function Page() {
  return (
    <ListPage>
      <ApplicationList />
    </ListPage>
  );
}

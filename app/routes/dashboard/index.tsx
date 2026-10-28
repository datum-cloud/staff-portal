import type { Route } from './+types/index';
import { RecentUsersWidget } from '@/features/dashboard';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

export const handle = {
  breadcrumb: () => <Trans>Dashboard</Trans>,
};

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <RecentUsersWidget />
      </div>
    </div>
  );
}

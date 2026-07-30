import type { Route } from './+types/chainsaw-tests';
import { ChainsawTestsWidget } from '@/features/chainsaw-tests';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject('Chainsaw Tests');
};

export const handle = {
  breadcrumb: () => <Trans>Chainsaw Tests</Trans>,
};

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <ChainsawTestsWidget />
    </div>
  );
}

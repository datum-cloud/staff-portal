import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { TicketList } from '@/features/support';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { useSearchParams } from 'react-router';

export const meta: Route.MetaFunction = () => metaObject(t`Support Tickets`);

export default function SupportIndexPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') ?? undefined;
  const mine = searchParams.get('mine') === 'true';

  return (
    <>
      <AppActionBar>{null}</AppActionBar>
      <TicketList params={{ status, ownerName: mine ? 'me' : undefined }} />
    </>
  );
}

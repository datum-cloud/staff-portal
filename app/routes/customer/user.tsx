import type { Route } from './+types/user';
import AppActionBar from '@/components/app-actiobar';
import { Button } from '@/modules/shadcn/ui/button';
import { metaObject } from '@/utils/helpers';
import { PlusIcon } from 'lucide-react';

export const meta: Route.MetaFunction = () => {
  return metaObject('Users');
};

export const handle = {
  breadcrumb: () => <span>Users</span>,
};

export default function CustomerUser() {
  return (
    <>
      <AppActionBar>
        <Button>
          <PlusIcon />
          New
        </Button>
      </AppActionBar>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {Array.from({ length: 24 }).map((_, index) => (
          <div key={index} className="bg-muted/50 aspect-video h-12 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}

import type { Route } from './+types/user';
import { metaObject } from '@/utils/helpers';

export const meta: Route.MetaFunction = () => {
  return metaObject('Users');
};

export const handle = {
  breadcrumb: () => <span>Users</span>,
};

export default function CustomerUser() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {Array.from({ length: 24 }).map((_, index) => (
        <div key={index} className="bg-muted/50 aspect-video h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

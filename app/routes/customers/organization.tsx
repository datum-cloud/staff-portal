import type { Route } from './+types/organization';
import { metaObject } from '@/utils/helpers';

export const meta: Route.MetaFunction = () => {
  return metaObject('Organizations');
};

export const handle = {
  breadcrumb: () => <span>Organizations</span>,
};

export default function CustomerOrganization() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {Array.from({ length: 24 }).map((_, index) => (
        <div key={index} className="bg-muted/50 aspect-video h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

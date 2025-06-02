import type { Route } from './+types/contact';
import { metaObject } from '@/utils/helpers';

export const meta: Route.MetaFunction = () => {
  return metaObject('Contacts');
};

export const handle = {
  breadcrumb: () => <span>Contacts</span>,
};

export default function MarketingContact() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {Array.from({ length: 24 }).map((_, index) => (
        <div key={index} className="bg-muted/50 aspect-video h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

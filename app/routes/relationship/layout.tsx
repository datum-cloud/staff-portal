import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Relationships</span>,
};

export default function RelationshipLayout() {
  return <Outlet />;
}

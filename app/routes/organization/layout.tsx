import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Organizations</span>,
};

export default function OrganizationLayout() {
  return <Outlet />;
}

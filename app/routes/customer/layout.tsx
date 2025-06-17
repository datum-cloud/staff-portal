import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Customers</span>,
};

export default function CustomerLayout() {
  return <Outlet />;
}

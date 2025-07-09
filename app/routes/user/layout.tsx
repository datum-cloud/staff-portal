import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Users</span>,
};

export default function Layout() {
  return <Outlet />;
}

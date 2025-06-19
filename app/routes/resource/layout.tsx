import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Resources</span>,
};

export default function ResourceLayout() {
  return <Outlet />;
}

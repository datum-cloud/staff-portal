import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Marketing</span>,
};

export default function MarketingLayout() {
  return <Outlet />;
}

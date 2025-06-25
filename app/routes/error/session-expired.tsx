import type { Route } from './+types/session-expired';
import AuthError from '@/components/error/auth';
import { metaObject } from '@/utils/helpers';

export const meta: Route.MetaFunction = () => {
  return metaObject('Session Expired');
};

export default function ErrorSessionExpired() {
  return <AuthError message="Session expired" />;
}

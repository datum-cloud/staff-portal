import type { Route } from './+types/oauth-error';
import { LogoIcon } from '@/components/logo/logo-icon';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { HomeIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Authentication Error' },
    { name: 'description', content: 'An error occurred during the authentication process.' },
  ];
};

export default function OAuthError() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const requestId = searchParams.get('request_id');

  const getErrorMessage = (error?: string | null) => {
    switch (error) {
      case 'missing_state':
        return 'The authentication session has expired or is invalid. This usually happens when you access the login page directly or if your browser cleared the authentication cookies.';
      case 'oauth_failed':
        return 'The authentication process failed. This could be due to a temporary issue with the authentication provider.';
      default:
        return 'An unexpected error occurred during the authentication process. Please try again.';
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Card className="w-1/2 overflow-hidden">
        <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
          <LogoIcon width={64} className="mb-4" />

          <div className="flex max-w-xl flex-col gap-2">
            <Text as="p" size="2xl" weight="bold" className="w-full text-center">
              Authentication Error
            </Text>
            <Text as="p" textColor="muted" className="text-center">
              {getErrorMessage(error)}
            </Text>

            {requestId && (
              <Text
                as="div"
                textColor="muted"
                className="rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center dark:bg-red-950/20">
                <Text as="div" size="xs">
                  <strong>Request ID:</strong> {requestId}
                </Text>
              </Text>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to={'/'}>
              <Button size="small">
                <HomeIcon className="size-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/login">
              <Button type="secondary" size="small">
                <ACTION_ICONS.refresh className="size-4" />
                Try Again
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

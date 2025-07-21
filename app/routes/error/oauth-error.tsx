import type { Route } from './+types/oauth-error';
import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@/modules/shadcn/ui/button';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { HomeIcon, RefreshCcwIcon } from 'lucide-react';
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
            <p className="w-full text-center text-2xl font-bold">Authentication Error</p>
            <p className="text-muted-foreground text-center text-sm">{getErrorMessage(error)}</p>

            {requestId && (
              <div className="text-muted-foreground rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center text-sm dark:bg-red-950/20">
                <div className="text-xs">
                  <strong>Request ID:</strong> {requestId}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to={'/'}>
              <Button size="sm">
                <HomeIcon className="size-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="sm">
                <RefreshCcwIcon className="size-4" />
                Try Again
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import type { Route } from './+types/not-found';
import { LogoIcon } from '@/components/logo/logo-icon';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { createRequestLogger, logger } from '@/utils/logger';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { HomeIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

function isDebugEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.ENV?.DEBUG || ['localhost', '127.0.0.1'].includes(window.location.hostname)
  );
}

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Page Not Found' },
    { name: 'description', content: 'The page you are looking for does not exist.' },
  ];
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const reqLogger = createRequestLogger({
    get: (key: string) => request.headers.get(key) || undefined,
  });
  const requestId = context.requestId;

  // Log the 404 error on the server side
  reqLogger.warn('Page not found', {
    reqId: requestId,
    url: url.pathname + url.search,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    referrer: request.headers.get('referer'),
  });

  // Return a 404 status
  return new Response(null, { status: 404 });
}

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDebug = isDebugEnvironment();

  useEffect(() => {
    // Log the 404 error using the existing logger
    logger.warn('Page not found', {
      url: location.pathname + location.search,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    });
  }, [location]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Card className="w-1/2 overflow-hidden">
        <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
          <LogoIcon width={64} className="mb-4" />

          <div className="flex max-w-xl flex-col gap-2">
            <Text as="p" size="2xl" weight="bold" className="w-full text-center">
              Page Not Found
            </Text>
            <Text as="p" textColor="muted" className="text-center">
              The page you are looking for doesn&apos;t exist. It might have been moved, deleted, or
              you entered the wrong URL.
            </Text>

            {isDebug && (
              <Text
                as="div"
                textColor="muted"
                className="rounded-r-md border-l-4 border-yellow-500 bg-yellow-50 p-4 text-center dark:bg-yellow-950/20">
                <code className="font-mono text-xs">
                  Path: {location.pathname}
                  {location.search && `?${location.search}`}
                </code>
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
            <Button type="secondary" size="small" onClick={() => navigate(-1)}>
              <ACTION_ICONS.refresh className="size-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

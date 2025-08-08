import type { Route } from './+types/not-found';
import { Button } from '@/components/button';
import { LogoIcon } from '@/components/logo/logo-icon';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { createRequestLogger, logger } from '@/utils/logger';
import { HomeIcon, RefreshCcwIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

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
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    setIsDebug(window.ENV?.DEBUG || ['localhost', '127.0.0.1'].includes(window.location.hostname));

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
            <p className="w-full text-center text-2xl font-bold">Page Not Found</p>
            <p className="text-muted-foreground text-center text-sm">
              The page you are looking for doesn&apos;t exist. It might have been moved, deleted, or
              you entered the wrong URL.
            </p>

            {isDebug && (
              <div className="text-muted-foreground rounded-r-md border-l-4 border-yellow-500 bg-yellow-50 p-4 text-center text-sm dark:bg-yellow-950/20">
                <code className="font-mono text-xs">
                  Path: {location.pathname}
                  {location.search && `?${location.search}`}
                </code>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to={'/'}>
              <Button size="small">
                <HomeIcon className="size-4" />
                Back to Home
              </Button>
            </Link>
            <Button type="secondary" theme="outline" size="small" onClick={() => navigate(-1)}>
              <RefreshCcwIcon className="size-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

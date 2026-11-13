import type { Route } from './+types/not-found';
import { LogoIcon } from '@/components/logo/logo-icon';
import { requestIdContext } from '@/server/context';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { createRequestLogger, logger } from '@/utils/logger';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
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

export async function loader({ request, url, context }: Route.LoaderArgs) {
  const reqLogger = createRequestLogger({
    get: (key: string) => request.headers.get(key) || undefined,
  });
  const requestId = context.get(requestIdContext);

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
    <div className="flex min-h-screen w-full items-center justify-center">
      <Card className="mx-4 w-full max-w-xl overflow-hidden">
        <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
          <LogoIcon width={64} className="mb-4" />

          <div className="flex w-full max-w-xl flex-col gap-2">
            <Text as="p" size="2xl" weight="bold" className="w-full text-center">
              <Trans>Page Not Found</Trans>
            </Text>
            <Text as="p" textColor="muted" className="text-center">
              <Trans>
                The page you are looking for doesn&apos;t exist. It might have been moved, deleted,
                or you entered the wrong URL.
              </Trans>
            </Text>

            {isDebug && (
              <Text
                as="div"
                textColor="muted"
                className="border-warning bg-warning/10 rounded-r-md border-l-4 p-4 text-center">
                <code className="font-mono text-xs break-all">
                  Path: {location.pathname}
                  {location.search && `?${location.search}`}
                </code>
              </Text>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LinkButton as={Link} href="/" size="small" icon={<HomeIcon className="size-4" />}>
              <Trans>Back to Home</Trans>
            </LinkButton>
            <Button type="secondary" size="small" onClick={() => navigate(-1)}>
              <ACTION_ICONS.refresh className="size-4" />
              <Trans>Go Back</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

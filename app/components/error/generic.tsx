import { Button } from '@/components/button';
import { LogoIcon } from '@/components/logo/logo-icon';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { HomeIcon, RefreshCcwIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

const GenericError = ({ message, requestId }: { message: string; requestId?: string }) => {
  const navigate = useNavigate();
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    setIsDebug(window.ENV?.DEBUG || ['localhost', '127.0.0.1'].includes(window.location.hostname));
  }, []);

  return (
    <Card className="w-1/2 overflow-hidden">
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />

        <div className="flex max-w-xl flex-col gap-2">
          <p className="w-full text-center text-2xl font-bold">Whoops! Something went wrong.</p>
          <p className="text-muted-foreground text-center text-sm">
            Something went wrong on our end. Our team has been notified, and we&apos;re working to
            fix it. Please try again later. If the issue persists, reach out to{' '}
            <Link to={`mailto:support@datum.net`} className="text-primary underline">
              support@datum.net
            </Link>
            .
          </p>

          <div className="text-muted-foreground rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center text-sm dark:bg-red-950/20">
            {requestId && (
              <div className="mt-2 text-xs">
                <strong>Request ID:</strong> {requestId}
              </div>
            )}
            {isDebug && <code className="font-mono text-xs">{message}</code>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={'/'}>
            <Button size="small" icon={<HomeIcon className="size-4" />}>
              Back to Home
            </Button>
          </Link>
          <Button
            type="primary"
            theme="outline"
            size="small"
            icon={<RefreshCcwIcon className="size-4" />}
            onClick={() => navigate(0)}>
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenericError;

import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@/modules/shadcn/ui/button';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { HomeIcon, RefreshCcwIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

const GenericError = ({ message }: { message: string }) => {
  const navigate = useNavigate();

  return (
    <Card className="w-1/2 overflow-hidden">
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />

        <div className="flex max-w-xl flex-col gap-2">
          <p className="w-full text-center text-2xl font-bold">Whoops! Something went wrong.</p>

          {['localhost', '127.0.0.1'].includes(window.location.hostname) ? (
            <div className="text-muted-foreground text-center text-sm">{message}</div>
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              Something went wrong on our end. Our team has been notified, and we&apos;re working to
              fix it. Please try again later. If the issue persists, reach out to{' '}
              <Link to={`mailto:support@datum.net`} className="text-primary underline">
                support@datum.net
              </Link>
              .
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to={'/'}>
            <Button size="sm">
              <HomeIcon className="size-4" />
              Back to Home
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => navigate(0)}>
            <RefreshCcwIcon className="size-4" />
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenericError;

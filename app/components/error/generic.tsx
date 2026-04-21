import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
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
          <p className="w-full text-center text-2xl font-bold">
            Something glitched! Probably not your fault.
          </p>

          <div className="text-muted-foreground rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center text-sm dark:bg-red-950/20">
            {requestId && (
              <div className="text-xs">
                <strong>Request ID:</strong> {requestId}
              </div>
            )}
            <code className="font-mono text-xs">{message}</code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={'/'}>
            <Button size="small">
              <HomeIcon className="size-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenericError;

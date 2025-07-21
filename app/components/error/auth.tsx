import { LogoIcon } from '@/components/logo/logo-icon';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Loader2Icon } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

const AuthError = ({ message, requestId }: { message: string; requestId?: string }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/logout', { replace: true });
  }, [navigate]);

  return (
    <Card className="w-1/2 overflow-hidden">
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />

        <div className="flex max-w-xl flex-col gap-2">
          <p className="w-full text-center text-2xl font-bold">Your session has expired</p>
          <div className="text-muted-foreground flex items-center justify-center gap-2 text-center text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Logging out...
          </div>
          {requestId && (
            <div className="text-muted-foreground rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center text-sm dark:bg-red-950/20">
              <div className="text-xs">
                <strong>Request ID:</strong> {requestId}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthError;

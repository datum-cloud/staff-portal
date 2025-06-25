import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@/modules/shadcn/ui/button';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { HomeIcon } from 'lucide-react';

const AuthError = ({ message }: { message: string }) => {
  return (
    <Card className="w-1/2 overflow-hidden">
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />

        <div className="flex max-w-xl flex-col gap-2">
          <p className="w-full text-center text-2xl font-bold">Authentication Error</p>
          <div className="text-muted-foreground text-center text-sm">{message}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="lg" onClick={() => (window.location.href = '/logout')}>
            <HomeIcon className="size-4" />
            Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthError;

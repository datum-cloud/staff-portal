import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { LogOutIcon } from 'lucide-react';
import { Link } from 'react-router';

export const meta = () => {
  return [
    { title: 'Access Denied' },
    { name: 'description', content: 'You do not have permission to access the Staff Portal.' },
  ];
};

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Card className="w-1/2 overflow-hidden">
        <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
          <LogoIcon width={64} className="mb-4" />

          <div className="flex max-w-xl flex-col gap-2">
            <p className="w-full text-center text-2xl font-bold">Access Denied</p>
            <p className="text-muted-foreground text-center text-sm">
              You don&apos;t have permission to access the Staff Portal. Please contact your
              administrator if you believe this is an error.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/logout">
              <Button size="small">
                <LogOutIcon className="size-4" />
                Sign Out
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

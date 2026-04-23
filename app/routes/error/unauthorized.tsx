import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <LogoIcon width={40} />
      <div className="flex flex-col items-center gap-2 text-center">
        <ShieldX className="text-destructive h-10 w-10" />
        <Title level={2}>
          <Trans>Access Denied</Trans>
        </Title>
        <Text textColor="muted" className="max-w-md">
          <Trans>
            You don&apos;t have permission to access the Staff Portal. Please contact your
            administrator if you believe this is an error.
          </Trans>
        </Text>
      </div>
      <Button theme="outline" onClick={() => navigate('/logout')}>
        <Trans>Sign Out</Trans>
      </Button>
    </div>
  );
}

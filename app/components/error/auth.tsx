import { LogoIcon } from '@/components/logo/logo-icon';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
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
          <Text as="p" size="2xl" weight="bold" className="w-full text-center">
            Your session has expired
          </Text>
          <Text
            as="div"
            textColor="muted"
            className="flex items-center justify-center gap-2 text-center">
            <STATUS_ICONS.loading className="size-4 animate-spin" />
            Logging out...
          </Text>
          {requestId && (
            <Text
              as="div"
              textColor="muted"
              className="rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center dark:bg-red-950/20">
              <Text as="div" size="xs">
                <strong>Request ID:</strong> {requestId}
              </Text>
            </Text>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthError;

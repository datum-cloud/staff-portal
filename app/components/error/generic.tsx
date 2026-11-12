import { LogoIcon } from '@/components/logo/logo-icon';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { HomeIcon } from 'lucide-react';
import { Link } from 'react-router';

const GenericError = ({ message, requestId }: { message: string; requestId?: string }) => {
  return (
    <Card className="mx-4 w-full max-w-xl overflow-hidden">
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />

        <div className="flex w-full max-w-xl flex-col gap-2">
          <Text as="p" size="2xl" weight="bold" className="w-full text-center">
            <Trans>Something glitched! Probably not your fault.</Trans>
          </Text>

          <Text
            as="div"
            textColor="muted"
            className="rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center dark:bg-red-950/20">
            {requestId && (
              <Text as="div" size="xs" className="break-all">
                <strong>
                  <Trans>Request ID:</Trans>
                </strong>{' '}
                {requestId}
              </Text>
            )}
            <code className="font-mono text-xs break-words">{message}</code>
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton as={Link} href="/" size="small" icon={<HomeIcon className="size-4" />}>
            <Trans>Back to Home</Trans>
          </LinkButton>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenericError;

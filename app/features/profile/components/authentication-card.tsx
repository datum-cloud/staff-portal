import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { Badge } from '@/modules/shadcn/ui/badge';
import { Button } from '@datum-ui/button';
import { Text } from '@datum-ui/typography';
import { useApp } from '@/providers/app.provider';
import { Trans } from '@lingui/react/macro';

export function AuthenticationCard() {
  const { user } = useApp();

  // Determine the identity provider name from annotations or fallback to Zitadel
  const identityProvider =
    (user?.metadata.annotations as any)?.['auth/provider'] || 'Zitadel';

  // Placeholder for authorization policy existence
  const hasAuthorizationPolicy = Boolean(
    (user?.metadata.annotations as any)?.['auth/authorization-policy']
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              <Trans>Authentication</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Manage how you sign in and secure your account</Trans>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <Text strong>
                <Trans>Authorization Policy</Trans>
              </Text>
              <Text size="xs" textColor="muted">
                <Trans>Shows if an authorization policy is applied to your account.</Trans>
              </Text>
            </div>
            <Badge variant={hasAuthorizationPolicy ? 'default' : 'outline'}>
              {hasAuthorizationPolicy ? <Trans>Enabled</Trans> : <Trans>None</Trans>}
            </Badge>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <Text strong>
                <Trans>Signed in with</Trans>
              </Text>
              <Text size="xs" textColor="muted">
                {identityProvider}
              </Text>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <Text strong>
                <Trans>Password</Trans>
              </Text>
              <Text size="xs" textColor="muted">
                <Trans>Change your password</Trans>
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Trans>Change password</Trans>
              </Button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <Text strong>
                <Trans>Two-Factor Authentication</Trans>
              </Text>
              <Text size="xs" textColor="muted">
                <Trans>Add an extra layer of security to your account</Trans>
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Trans>Manage</Trans>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


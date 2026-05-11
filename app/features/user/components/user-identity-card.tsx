import { IdentityItem } from './identity-item';
import { IdentityItemSkeleton } from './identity-item-skeleton';
import { DateTime } from '@/components/date';
import GitHubIcon from '@/components/icon/github';
import GoogleIcon from '@/components/icon/google';
import { useEnv } from '@/hooks';
import { useIdentityListQuery, useSessionListEnrichedQuery } from '@/resources/request/client';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import {
  CircleAlertIcon,
  ExternalLinkIcon,
  FingerprintPattern,
  GlobeIcon,
  MailIcon,
} from 'lucide-react';
import { ComponentType, SVGProps } from 'react';

const PROVIDERS: Record<string, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  email: { label: 'Email', Icon: MailIcon },
  google: { label: 'Google', Icon: GoogleIcon },
  github: { label: 'GitHub', Icon: GitHubIcon },
};

export const UserIdentityCard = ({
  userId,
  readOnly = false,
  showSessions = false,
}: {
  userId: string;
  readOnly?: boolean;
  showSessions?: boolean;
}) => {
  const { data: identities, isLoading: isLoadingIdentities } = useIdentityListQuery(userId);
  const { data: sessionItems = [], isLoading: isLoadingSessions } = useSessionListEnrichedQuery(
    showSessions ? userId : ''
  );
  const sortedSessions = [...sessionItems].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  );
  const env = useEnv();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FingerprintPattern className="h-4 w-4" />
          <Trans>Account Identities</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingIdentities ? (
          <IdentityItemSkeleton count={1} showActions />
        ) : (
          <div className="divide-stepper-line flex flex-col divide-y">
            {identities?.data?.data?.items?.map((identity) => {
              const provider = identity.status?.providerName?.toLowerCase() ?? 'email';
              const providerMeta = PROVIDERS?.[provider];
              return (
                <IdentityItem
                  key={identity.metadata?.name}
                  className="py-2"
                  icon={
                    providerMeta ? (
                      <providerMeta.Icon className="size-3.5" />
                    ) : (
                      <MailIcon className="size-3.5" />
                    )
                  }
                  label={providerMeta?.label ?? 'Email address'}
                  sublabel={identity.status?.username}
                  middleContent={
                    // TODO: Enable this when we have a way to get the last used date
                    // <span className="text-foreground/80 text-center text-xs">Last used Jun 4</span>
                    undefined
                  }
                  rightContent={
                    readOnly ? undefined : (
                      <>
                        {provider === 'github' && (
                          <Tooltip
                            message={
                              <div className="flex flex-col gap-3.5 p-4">
                                <h4 className="text-sm font-semibold">
                                  <Trans>Updating email addresses for GitHub identities</Trans>
                                </h4>
                                <p className="text-xs text-wrap">
                                  <Trans>
                                    Email addresses for GitHub identities should be updated through
                                    GitHub
                                  </Trans>
                                </p>
                                <ul className="list-outside list-decimal space-y-3.5 pl-4 text-xs text-wrap">
                                  <li>
                                    <Trans>Log out of Datum</Trans>
                                  </li>
                                  <li>
                                    <Trans>
                                      Change your Primary Email in GitHub (your primary email)
                                    </Trans>
                                  </li>
                                  <li>
                                    <Trans>Log out of GitHub</Trans>
                                  </li>
                                  <li>
                                    <Trans>
                                      Log back into GitHub (with the new, desired email set as
                                      primary)
                                    </Trans>
                                  </li>
                                  <li>
                                    <Trans>Log back into Datum</Trans>
                                  </li>
                                </ul>
                              </div>
                            }>
                            <div className="pointer flex cursor-pointer items-center gap-2.5">
                              <CircleAlertIcon size={12} className="text-primary" />
                              <span className="text-primary text-xs underline">
                                <Trans>How to update your GitHub email</Trans>
                              </span>
                            </div>
                          </Tooltip>
                        )}
                        <LinkButton
                          href={`${env?.AUTH_OIDC_ISSUER}/ui/v2/login/idp/link`}
                          target="_blank"
                          rel="noopener noreferrer"
                          theme="outline"
                          size="small"
                          icon={<ExternalLinkIcon size={12} />}
                          iconPosition="right">
                          <Trans>Manage</Trans>
                        </LinkButton>
                      </>
                    )
                  }
                />
              );
            })}
          </div>
        )}

        {showSessions && (
          <div className="mt-6">
            <Text size="sm" weight="medium" className="mb-3 block">
              <Trans>Active Sessions</Trans>
            </Text>
            {isLoadingSessions ? (
              <IdentityItemSkeleton count={1} showActions={false} />
            ) : sessionItems.length === 0 ? (
              <Text textColor="muted" size="sm">
                <Trans>No active sessions.</Trans>
              </Text>
            ) : (
              <div
                // Cap visible rows at ~4 and scroll for the rest. Each
                // IdentityItem is ~50px (size-[34px] icon + py-2), so
                // max-h-[13rem] keeps the 5th+ row just out of view to
                // hint there's more.
                className="divide-stepper-line flex max-h-[13rem] flex-col divide-y overflow-y-auto pr-1">
                {sortedSessions.map((session) => {
                  const locationLabel = session.location?.formatted;
                  const uaLabel = session.userAgent?.formatted;
                  const sublabelParts = [uaLabel, locationLabel].filter(Boolean);
                  return (
                    <IdentityItem
                      key={session.id}
                      className="py-2"
                      icon={<GlobeIcon className="size-3.5" />}
                      label={session.ipAddress ?? 'Unknown IP'}
                      sublabel={sublabelParts.length ? sublabelParts.join(' · ') : session.id}
                      middleContent={
                        session.createdAt ? (
                          <span className="text-foreground/80 text-center text-xs">
                            <Trans>Created</Trans>{' '}
                            <DateTime date={session.createdAt} variant="relative" />
                          </span>
                        ) : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { IdentityItem } from './identity-item';
import { IdentityItemSkeleton } from './identity-item-skeleton';
import GitHubIcon from '@/components/icon/github';
import GoogleIcon from '@/components/icon/google';
import { useEnv } from '@/hooks';
import { useIdentityListQuery } from '@/resources/request/client';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Trans } from '@lingui/react/macro';
import { CircleAlertIcon, ExternalLinkIcon, FingerprintPattern, MailIcon } from 'lucide-react';
import { ComponentType, SVGProps } from 'react';

const PROVIDERS: Record<string, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  email: { label: 'Email', Icon: MailIcon },
  google: { label: 'Google', Icon: GoogleIcon },
  github: { label: 'GitHub', Icon: GitHubIcon },
};

export const UserIdentityCard = ({ userId }: { userId: string }) => {
  const { data: identities, isLoading: isLoadingIdentities } = useIdentityListQuery(userId);
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
                  }
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

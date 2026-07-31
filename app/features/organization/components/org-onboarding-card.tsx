import {
  buildOnboardingSteps,
  type OnboardingStepId,
  type OnboardingStepState,
} from '../lib/onboarding-steps';
import { CustomerStatus } from '@/components/badge';
import { SectionCard } from '@/features/milo';
import type { GqlOrganization } from '@/modules/graphql/organizations';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import {
  Building2,
  Check,
  CircleDot,
  CreditCard,
  Ellipsis,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

const STEP_COUNT = 4;

function OnboardingSkeleton() {
  return (
    <ol className="flex w-full flex-col gap-0 pt-1 md:flex-row md:items-start" aria-hidden>
      {Array.from({ length: STEP_COUNT }).map((_, index) => {
        const isLast = index === STEP_COUNT - 1;
        return (
          <li
            key={index}
            className={cn(
              'relative flex min-w-0 items-start gap-3',
              'md:flex-1 md:flex-col md:items-center md:gap-0 md:px-1'
            )}>
            {/* Mobile vertical connector */}
            {!isLast && (
              <div className="bg-stepper-line absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 md:hidden" />
            )}
            {/* Desktop horizontal connector */}
            {!isLast && (
              <div className="bg-stepper-line absolute top-5 right-[calc(-50%+1.25rem)] left-[calc(50%+1.25rem)] hidden h-0.5 rounded-full md:block" />
            )}
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col pb-5 md:items-center md:pb-0">
              <Skeleton className="h-2.5 w-10 md:mt-3" />
              <Skeleton className="mt-2 h-4 w-28 md:w-20" />
              <Skeleton className="mt-2 h-5 w-16 rounded-full" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const STEP_TITLES: Record<OnboardingStepId, ReactNode> = {
  contact: <Trans>Contact details</Trans>,
  billing: <Trans>Billing account</Trans>,
  payment: <Trans>Payment method</Trans>,
  complete: <Trans>Ready</Trans>,
};

const STEP_ICONS: Record<OnboardingStepId, LucideIcon> = {
  contact: UserRound,
  billing: Building2,
  payment: CreditCard,
  complete: CircleDot,
};

const STATUS_LABEL: Record<OnboardingStepState, ReactNode> = {
  complete: <Trans>Completed</Trans>,
  current: <Trans>In Progress</Trans>,
  failed: <Trans>Failed</Trans>,
  upcoming: <Trans>Pending</Trans>,
};

function StepIcon({ id, state }: { id: OnboardingStepId; state: OnboardingStepState }) {
  const stepIcon =
    state === 'complete'
      ? Check
      : state === 'failed'
        ? X
        : state === 'upcoming' && id === 'complete'
          ? Ellipsis
          : STEP_ICONS[id];

  return (
    <span
      className={cn(
        'relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full border-2',
        state === 'complete' && 'border-btn-success bg-btn-success text-btn-success-foreground',
        state === 'current' &&
          'border-badge-info bg-badge-info text-badge-info-foreground ring-badge-info/20 ring-4',
        state === 'failed' &&
          'border-destructive bg-destructive text-destructive-foreground ring-destructive/20 ring-4',
        state === 'upcoming' && 'border-border bg-muted text-muted-foreground'
      )}
      aria-hidden>
      <Icon
        icon={stepIcon}
        size={20}
        strokeWidth={state === 'complete' || state === 'failed' ? 2.5 : 2}
      />
    </span>
  );
}

function StatusPill({ state }: { state: OnboardingStepState }) {
  const type =
    state === 'complete'
      ? 'success'
      : state === 'current'
        ? 'info'
        : state === 'failed'
          ? 'danger'
          : 'muted';
  const theme = state === 'upcoming' ? 'solid' : 'light';

  return (
    <Badge
      type={type}
      theme={theme}
      className="rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium">
      {STATUS_LABEL[state]}
    </Badge>
  );
}

function StepConnector({
  isLast,
  lineComplete,
  linePartial,
  lineFailed,
}: {
  isLast: boolean;
  lineComplete: boolean;
  linePartial: boolean;
  lineFailed: boolean;
}) {
  if (isLast) return null;

  const fillClass = cn(
    'rounded-full transition-[height,width] duration-300',
    lineComplete && 'bg-btn-success',
    linePartial && 'bg-badge-info',
    lineFailed && 'bg-destructive',
    !lineComplete && !linePartial && !lineFailed && 'bg-transparent'
  );

  const fillAmount = lineComplete ? '100%' : linePartial || lineFailed ? '50%' : '0%';

  return (
    <>
      {/* Mobile: vertical line under the icon */}
      <div className="absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 md:hidden" aria-hidden>
        <div className="bg-stepper-line h-full w-full rounded-full" />
        <div className={cn('absolute inset-x-0 top-0', fillClass)} style={{ height: fillAmount }} />
      </div>

      {/* Desktop: horizontal line between icons */}
      <div
        className="absolute top-5 right-[calc(-50%+1.25rem)] left-[calc(50%+1.25rem)] hidden h-0.5 md:block"
        aria-hidden>
        <div className="bg-stepper-line h-full w-full rounded-full" />
        <div className={cn('absolute inset-y-0 left-0', fillClass)} style={{ width: fillAmount }} />
      </div>
    </>
  );
}

type Props = {
  org: GqlOrganization | null | undefined;
  hasBillingAccount: boolean;
  /** Sole payment method on a billing account is Failed. */
  paymentMethodFailed?: boolean;
  isLoading?: boolean;
  className?: string;
};

export function OrgOnboardingCard({
  org,
  hasBillingAccount,
  paymentMethodFailed = false,
  isLoading,
  className,
}: Props) {
  const { steps, waitingMessage } = buildOnboardingSteps({
    org,
    hasBillingAccount,
    paymentMethodFailed,
  });
  const isActive = org?.onboardingComplete === true;
  const headerStatus = paymentMethodFailed && !isActive ? 'failed' : org?.onboardingStatus;

  return (
    <SectionCard
      className={className}
      title={<Trans>Onboarding</Trans>}
      action={
        isLoading ? (
          <Skeleton className="h-4 w-[54px] rounded-[3px]" />
        ) : org ? (
          <CustomerStatus
            status={headerStatus ?? 'inactive'}
            tooltip={isActive ? undefined : (waitingMessage ?? org.onboardingReason ?? undefined)}
          />
        ) : null
      }>
      {isLoading ? (
        <OnboardingSkeleton />
      ) : (
        <div className="space-y-4">
          {!isActive && waitingMessage && (
            <Text size="sm" textColor="muted">
              {waitingMessage}
            </Text>
          )}

          <ol className="flex w-full flex-col pt-1 md:flex-row md:items-start">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              const lineComplete = step.state === 'complete';
              const linePartial = step.state === 'current';
              const lineFailed = step.state === 'failed';

              return (
                <li
                  key={step.id}
                  className={cn(
                    'relative flex min-w-0 items-start gap-3',
                    'md:flex-1 md:flex-col md:items-center md:gap-0 md:px-1'
                  )}>
                  <StepConnector
                    isLast={isLast}
                    lineComplete={lineComplete}
                    linePartial={linePartial}
                    lineFailed={lineFailed}
                  />

                  <StepIcon id={step.id} state={step.state} />

                  <div
                    className={cn(
                      'flex min-w-0 flex-1 flex-col',
                      !isLast && 'pb-5',
                      'md:items-center md:pb-0'
                    )}>
                    <Text
                      size="xs"
                      className={cn(
                        'text-stepper-label text-[10px] tracking-wide uppercase',
                        'md:mt-3',
                        step.state === 'upcoming' && 'opacity-70'
                      )}>
                      <Trans>Step {index + 1}</Trans>
                    </Text>

                    <Text
                      size="sm"
                      weight="medium"
                      className={cn(
                        'mt-0.5 leading-snug md:mt-1 md:text-center',
                        step.state === 'upcoming' && 'text-muted-foreground',
                        step.state === 'failed' && 'text-destructive'
                      )}>
                      {STEP_TITLES[step.id]}
                    </Text>

                    <div className="mt-1.5 md:mt-2">
                      <StatusPill state={step.state} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </SectionCard>
  );
}

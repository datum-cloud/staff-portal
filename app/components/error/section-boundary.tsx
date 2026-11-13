import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import * as Sentry from '@sentry/react-router';
import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';

interface SectionErrorBoundaryProps {
  className?: string;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

/** Catches a render error in one section and shows a small fallback in its place. */
class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The page keeps working, so report it here or nobody would hear about it.
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Card className={cn('h-full', this.props.className)}>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Icon icon={STATUS_ICONS.warning} className="text-warning size-5" aria-hidden />
          <Text as="p" size="sm" textColor="muted">
            <Trans>This section couldn&apos;t be shown. The rest of the page still works.</Trans>
          </Text>
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="small"
            onClick={() => this.setState({ hasError: false })}>
            <Trans>Try again</Trans>
          </Button>
        </CardContent>
      </Card>
    );
  }
}

/**
 * Wrap a page section (e.g. a card) so a render error shows a small fallback in
 * its place instead of taking down the whole page. The `Suspense` lets an error
 * during server rendering fall back to rendering in the browser, where the
 * boundary can catch it; on its own a boundary only catches browser errors.
 */
export function SectionBoundary({ className, children }: SectionErrorBoundaryProps) {
  return (
    <SectionErrorBoundary className={className}>
      <Suspense fallback={null}>{children}</Suspense>
    </SectionErrorBoundary>
  );
}

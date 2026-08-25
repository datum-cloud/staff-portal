import { normalizeEndpoint } from '@/modules/sentry/fingerprint';
import { shouldReportApiError } from '@/modules/sentry/report-policy';
import { scrubValue } from '@/modules/sentry/scrub';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import * as Sentry from '@sentry/react';

interface UserContext {
  id: string;
  uid: string;
  email: string;
  username: string;
  name: string;
  creation_date: string;
  state?: string;
  theme?: string;
  timezone?: string;
  generation: number;
  resource_version: string;
}

/**
 * Set user context in Sentry for error tracking
 * This function should be called when a user logs in
 */
export function setSentryUser(user: ComMiloapisIamV1Alpha1User): void {
  const normalizedUser: UserContext = {
    id: user.metadata?.name ?? '',
    uid: user.metadata?.uid ?? '',
    email: user.spec?.email ?? '',
    username: user.spec?.email ?? '',
    name: `${user.spec?.givenName ?? ''} ${user.spec?.familyName ?? ''}`,
    creation_date: user.metadata?.creationTimestamp ?? '',
    state: user.status?.state,
    theme: user.metadata?.annotations?.['preferences/theme'],
    timezone: user.metadata?.annotations?.['preferences/timezone'],
    generation: user.metadata?.generation ?? 0,
    resource_version: user.metadata?.resourceVersion ?? '',
  };

  // Set user context in Sentry for error tracking
  Sentry.setUser({
    id: normalizedUser.id,
    email: normalizedUser.email,
    username: normalizedUser.username,
  });

  // Add user context as tags for better filtering in Sentry
  (Object.entries(normalizedUser) as Array<[string, unknown]>).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      Sentry.setTag(`user.${key}`, String(value));
    }
  });

  // Add user context as extra data for more detailed debugging
  Sentry.setContext('user', normalizedUser as unknown as Record<string, unknown>);
}

/**
 * Clear user context in Sentry
 * This function should be called when a user logs out
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
  Sentry.setContext('user', null);

  // Clear all user-related tags based on the NormalizedUser interface
  const userTagKeys: Array<keyof UserContext> = [
    'id',
    'uid',
    'email',
    'username',
    'name',
    'creation_date',
    'state',
    'theme',
    'timezone',
    'generation',
    'resource_version',
  ];

  userTagKeys.forEach((key) => {
    Sentry.setTag(`user.${key}`, undefined);
  });
}

/**
 * Add custom breadcrumb to Sentry for better debugging context
 */
export function addSentryBreadcrumb(
  message: string,
  category: string = 'user',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Set custom tag in Sentry for filtering and organization
 */
export function setSentryTag(key: string, value: string | number | boolean | undefined): void {
  Sentry.setTag(key, value);
}

/**
 * Set custom context in Sentry for additional debugging information
 */
export function setSentryContext(name: string, context: Record<string, any> | null): void {
  Sentry.setContext(name, context);
}

/**
 * Capture API request errors with proper context and categorization.
 *
 * A breadcrumb is always recorded (cheap context for a later real error), but
 * the exception is only sent to Sentry for *unexpected* failures — 5xx and
 * network errors. Handled 4xx responses are logged and shown to the user
 * elsewhere; they are not application bugs, so they stay out of Sentry.
 *
 * Tags, level, fingerprint, and the (scrubbed) response body are applied on an
 * isolated `withScope`, so they never leak onto unrelated later events.
 */
export function captureApiError(
  error: Error,
  context: {
    url?: string;
    method?: string;
    status?: number;
    requestId?: string;
    responseData?: any;
  }
): void {
  // Add breadcrumb for debugging context
  addSentryBreadcrumb(
    `API request failed: ${context.method?.toUpperCase()} ${context.url}`,
    'http',
    'error',
    {
      url: context.url,
      method: context.method,
      status: context.status,
      requestId: context.requestId,
    }
  );

  // Handled 4xx failures are surfaced + logged elsewhere; keep them out of Sentry.
  if (!shouldReportApiError(context.status)) return;

  const status = context.status;

  Sentry.withScope((scope) => {
    scope.setTag('error.type', 'api_request');
    scope.setTag('error.status', status?.toString() || 'unknown');
    scope.setTag('error.endpoint', context.url || 'unknown');
    scope.setTag('error.method', context.method || 'unknown');
    if (context.requestId) scope.setTag('error.request_id', context.requestId);

    scope.setLevel(status && status >= 500 ? 'error' : 'warning');
    scope.setFingerprint([
      'api',
      context.method || 'unknown',
      normalizeEndpoint(context.url),
      status?.toString() || 'unknown',
    ]);

    scope.setExtra('requestId', context.requestId);
    if (context.responseData !== undefined) {
      scope.setExtra('responseData', scrubValue(context.responseData));
    }

    Sentry.captureException(error);
  });
}

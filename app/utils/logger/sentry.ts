import type { User } from '@/resources/schemas';
import * as Sentry from '@sentry/react';

/**
 * Set user context in Sentry for error tracking
 * This function should be called when a user logs in
 */
export function setSentryUser(user: User): void {
  // Set user context in Sentry for error tracking
  Sentry.setUser({
    id: user.metadata.uid,
    email: user.spec.email,
    username: user.metadata.name,
  });

  // Add user context as tags for better filtering in Sentry
  Sentry.setTag('user.id', user.metadata.uid);
  Sentry.setTag('user.email', user.spec.email);
  Sentry.setTag('user.name', `${user.spec.givenName} ${user.spec.familyName}`);
  Sentry.setTag('user.creation_date', user.metadata.creationTimestamp);
  Sentry.setTag('user.state', user.status?.state || 'unknown');
  Sentry.setTag('user.theme', user.metadata.annotations?.['preferences/theme'] || 'light');
  Sentry.setTag('user.timezone', user.metadata.annotations?.['preferences/timezone'] || 'Etc/GMT');

  // Add user context as extra data for more detailed debugging
  Sentry.setContext('user', {
    uid: user.metadata.uid,
    email: user.spec.email,
    fullName: `${user.spec.givenName} ${user.spec.familyName}`,
    username: user.metadata.name,
    creationDate: user.metadata.creationTimestamp,
    state: user.status?.state,
    theme: user.metadata.annotations?.['preferences/theme'],
    timezone: user.metadata.annotations?.['preferences/timezone'],
    generation: user.metadata.generation,
    resourceVersion: user.metadata.resourceVersion,
  });
}

/**
 * Clear user context in Sentry
 * This function should be called when a user logs out
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
  Sentry.setTag('user.id', undefined);
  Sentry.setTag('user.email', undefined);
  Sentry.setTag('user.name', undefined);
  Sentry.setTag('user.creation_date', undefined);
  Sentry.setTag('user.state', undefined);
  Sentry.setTag('user.theme', undefined);
  Sentry.setTag('user.timezone', undefined);
  Sentry.setContext('user', null);
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

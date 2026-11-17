import { authenticator } from '@/modules/auth';
import { isStaffMember } from '@/modules/auth/require-staff.server';
import { EnvVariables } from '@/server/iface';
import { logApiError } from '@/server/logger';
import { createErrorResponse } from '@/server/response';
import { env } from '@/utils/config/env.server';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';
import { createRequestLogger } from '@/utils/logger';
import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { createHash } from 'node:crypto';

/** How long one staff-membership decision is reused before the IdP is asked again. */
export const STAFF_MEMBERSHIP_TTL_MS = 60_000;

/** Upper bound on cached decisions, so the cache can't grow without limit. */
const STAFF_MEMBERSHIP_CACHE_MAX = 1_000;

type StaffDecision = { isStaff: boolean; expiresAt: number };

/** Keyed by a hash of the access token, so each session (and each refresh) has its own entry. */
const staffDecisions = new Map<string, StaffDecision>();

const sessionKey = (accessToken: string): string =>
  createHash('sha256').update(accessToken).digest('hex');

function rememberDecision(key: string, isStaff: boolean, now: number): void {
  staffDecisions.forEach((entry, k) => {
    if (entry.expiresAt <= now) staffDecisions.delete(k);
  });
  if (staffDecisions.size >= STAFF_MEMBERSHIP_CACHE_MAX) {
    const oldest = staffDecisions.keys().next().value;
    if (oldest !== undefined) staffDecisions.delete(oldest);
  }
  staffDecisions.set(key, { isStaff, expiresAt: now + STAFF_MEMBERSHIP_TTL_MS });
}

/**
 * Same staff-group check the page layouts run (`requireStaffUser`), cached per
 * session for `STAFF_MEMBERSHIP_TTL_MS`. Lookup failures other than 401/403
 * are not cached and surface as errors.
 */
async function isStaffSession(accessToken: string, userId: string): Promise<boolean> {
  const key = sessionKey(accessToken);
  const now = Date.now();
  const cached = staffDecisions.get(key);
  if (cached && cached.expiresAt > now) return cached.isStaff;

  const isStaff = await isStaffMember(accessToken, userId);
  rememberDecision(key, isStaff, Date.now());
  return isStaff;
}

/** Test hook: forget every cached staff decision. */
export function clearStaffMembershipCache(): void {
  staffDecisions.clear();
}

/**
 * Hono middleware for authentication
 * Validates user authentication and staff-group membership, then sets the
 * access token in context. A signed-in user outside the staff group gets 403.
 */
export function authMiddleware() {
  return createMiddleware(async (c: Context<{ Variables: EnvVariables }>, next: Next) => {
    const startTime = performance.now();
    const reqLogger = createRequestLogger(c);
    const reqId = c.get('requestId');

    // Get cookies from the request
    const cookieHeader = c.req.header('Cookie');

    // Create a Request object from Hono context to use with existing auth utilities
    const request = new Request(c.req.url, {
      method: c.req.method,
      headers: {
        Cookie: cookieHeader || '',
        ...c.req.header(),
      },
    });

    try {
      // Check if user is authenticated
      const isAuthenticated = await authenticator.isAuthenticated(request);
      if (!isAuthenticated) {
        throw new AuthenticationError('Authentication required', reqId);
      }

      // Get the session with access token
      const session = await authenticator.getSession(request);
      if (!session?.accessToken) {
        throw new AuthenticationError('No access token available', reqId);
      }

      // Under Cypress the caller is a CI service account outside the staff
      // group, matching the bypass in requireStaffUser.
      if (!env.isCypress && !(await isStaffSession(session.accessToken, session.sub))) {
        throw new AuthorizationError('Staff access required', reqId);
      }

      c.set('token', session.accessToken);
      c.set('userId', session.sub);

      await next();
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);

      // Use typed error logging
      await logApiError(reqLogger, error, {
        path: c.req.path,
        method: c.req.method,
        duration,
        userAgent: c.req.header('User-Agent'),
        ip:
          c.req.header('x-forwarded-for') ||
          c.req.header('x-real-ip') ||
          c.req.header('x-client-ip') ||
          c.req.header('cf-connecting-ip') ||
          c.req.header('x-forwarded') ||
          'unknown',
      });

      // Handle any authentication errors or unexpected errors
      const { response, status } = await createErrorResponse(reqId, error, c.req.path);
      return c.json(response, status as any);
    }
  });
}

export const getToken = (c: Context<{ Variables: EnvVariables }>) => {
  return c.get('token') as string;
};

export const getUserId = (c: Context<{ Variables: EnvVariables }>) => {
  return c.get('userId') as string;
};

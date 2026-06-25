import { createGqlClient } from './client';
import { generateQueryOp } from './generated';
import type { ExtendedSession as GeneratedExtendedSession } from './generated/schema';
import { mapApiError } from '@/utils/errors/error-mapper';

export interface ExtendedSession {
  id: string;
  userUID: string;
  provider: string;
  ipAddress: string | null;
  fingerprintID: string | null;
  createdAt: string;
  lastUpdatedAt: string | null;
  userAgent: {
    browser: string | null;
    os: string | null;
    formatted: string;
  } | null;
  location: {
    city: string | null;
    country: string | null;
    countryCode: string | null;
    formatted: string;
  } | null;
}

/**
 * Lists sessions enriched with parsed user-agent and geolocation.
 *
 * When userID is omitted (or matches the caller's UID), returns the
 * caller's own sessions. When it differs, the gateway forwards a
 * status.userUID field selector and the auth-provider-zitadel REST
 * handler authorizes the cross-user lookup via SubjectAccessReview
 * against iam.miloapis.com/users/<userID>. Callers without that
 * permission get an empty list (the underlying 403 is logged).
 */
export async function listSessions(userID?: string): Promise<ExtendedSession[]> {
  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    sessions: [
      { userID: userID ?? null },
      {
        id: true,
        userUID: true,
        provider: true,
        ipAddress: true,
        fingerprintID: true,
        createdAt: true,
        lastUpdatedAt: true,
        userAgent: { browser: true, os: true, formatted: true },
        location: { city: true, country: true, countryCode: true, formatted: true },
      },
    ],
  });

  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);

  return (result.data?.sessions ?? []).map((s: GeneratedExtendedSession) => ({
    id: s.id,
    userUID: s.userUID,
    provider: s.provider,
    ipAddress: s.ipAddress ?? null,
    fingerprintID: s.fingerprintID ?? null,
    createdAt: s.createdAt,
    lastUpdatedAt: s.lastUpdatedAt ?? null,
    userAgent: s.userAgent
      ? {
          browser: s.userAgent.browser ?? null,
          os: s.userAgent.os ?? null,
          formatted: s.userAgent.formatted,
        }
      : null,
    location: s.location
      ? {
          city: s.location.city ?? null,
          country: s.location.country ?? null,
          countryCode: s.location.countryCode ?? null,
          formatted: s.location.formatted,
        }
      : null,
  }));
}

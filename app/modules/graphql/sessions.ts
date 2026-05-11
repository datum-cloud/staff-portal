import { gqlRequest } from './client';

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

const SESSIONS_QUERY = /* GraphQL */ `
  query Sessions($userID: ID) {
    sessions(userID: $userID) {
      id
      userUID
      provider
      ipAddress
      fingerprintID
      createdAt
      lastUpdatedAt
      userAgent {
        browser
        os
        formatted
      }
      location {
        city
        country
        countryCode
        formatted
      }
    }
  }
`;

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
  const data = await gqlRequest<{ sessions: ExtendedSession[] }>(SESSIONS_QUERY, {
    userID: userID ?? null,
  });
  return data.sessions;
}

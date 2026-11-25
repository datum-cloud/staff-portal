import { buildEndSessionRequest } from './end-session.server';
import { describe, expect, it } from 'vitest';

const config = {
  issuer: 'https://auth.example.test',
  clientId: 'client-123',
  postLogoutRedirectUri: 'https://staff.example.test/login',
};

describe('buildEndSessionRequest', () => {
  it('returns null without an id token, so the caller falls back to a local sign-out', () => {
    expect(buildEndSessionRequest(undefined, config)).toBeNull();
    expect(buildEndSessionRequest('', config)).toBeNull();
  });

  // The fields go in a form POST body, never the URL, so the id token stays
  // out of browser history and the IdP's access logs.
  it('posts the id token hint and return address to the issuer end_session endpoint', () => {
    expect(buildEndSessionRequest('id-token', config)).toEqual({
      action: 'https://auth.example.test/oidc/v1/end_session',
      fields: {
        id_token_hint: 'id-token',
        client_id: 'client-123',
        post_logout_redirect_uri: 'https://staff.example.test/login',
      },
    });
  });

  it('copes with a trailing slash on the issuer', () => {
    const request = buildEndSessionRequest('id-token', { ...config, issuer: `${config.issuer}/` });

    expect(request?.action).toBe('https://auth.example.test/oidc/v1/end_session');
  });

  // Zitadel answers 400 when client_id comes without a registered redirect URI
  // (or the other way round), so both go together or neither does.
  it.each([
    ['client id', { clientId: '' }],
    ['post-logout redirect URI', { postLogoutRedirectUri: '' }],
  ])('leaves both return fields out when the %s is missing', (_case, override) => {
    expect(buildEndSessionRequest('id-token', { ...config, ...override })?.fields).toEqual({
      id_token_hint: 'id-token',
    });
  });
});

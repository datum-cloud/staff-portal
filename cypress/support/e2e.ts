import '@testing-library/cypress/add-commands';

/**
 * Login by building and signing a `_session` cookie, the same way the app does
 * server-side (app/utils/cookies/session.ts). The session payload must belong to
 * a user in the staff group, otherwise the private layout loader redirects away
 * (see app/layouts/private.layout.tsx).
 *
 * Values come from options or the ACCESS_TOKEN / SUB environment variables.
 */
Cypress.Commands.add('login', (options?: { accessToken?: string; sub?: string }) => {
  const accessToken = options?.accessToken ?? Cypress.env('ACCESS_TOKEN');
  const sub = options?.sub ?? Cypress.env('SUB');

  if (!accessToken) {
    throw new Error(
      'accessToken is required. Provide it via options or the ACCESS_TOKEN environment variable.'
    );
  }
  if (!sub) {
    throw new Error('sub is required. Provide it via options or the SUB environment variable.');
  }

  const sessionId = `session-${accessToken.substring(0, 20)}-${sub}`;

  cy.session(
    sessionId,
    () => {
      const baseUrl = Cypress.config('baseUrl');
      if (!baseUrl) {
        throw new Error('baseUrl is required in Cypress configuration');
      }
      const url = new URL(baseUrl);
      const domain = url.hostname;
      const isSecure = url.protocol === 'https:';

      const now = new Date();
      const expiredAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // now + 12h

      const sessionData = {
        accessToken,
        refreshToken: null,
        expiredAt: expiredAt.toISOString(),
        sub,
      };

      cy.task<string>('signSessionCookie', sessionData).then((signedCookieValue) => {
        if (!signedCookieValue) {
          throw new Error('Failed to sign session cookie');
        }

        cy.setCookie('_session', signedCookieValue, {
          httpOnly: true,
          secure: isSecure,
          path: '/',
          sameSite: 'lax',
          domain,
        });
      });
    },
    {
      validate: () => {
        // The dashboard index ('/') is behind the staff-only private layout.
        cy.request({
          url: `${Cypress.config('baseUrl')}/`,
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status !== 200) {
            throw new Error('Session validation failed');
          }
        });
      },
      cacheAcrossSpecs: true,
    }
  );
});

/**
 * Logout via the UI (user menu → Log Out). Stubs the onward login/OIDC redirect
 * so Cypress does not navigate cross-origin. After this resolves the `_session`
 * cookie no longer exists.
 */
Cypress.Commands.add('logout', () => {
  cy.intercept('GET', '/auth/login*', { statusCode: 200, body: '' }).as('__logoutLoginRedirect');
  cy.get('[data-e2e="user-menu-trigger"]').click();
  cy.get('[data-e2e="user-menu-logout"]').click();
  cy.getCookie('_session').should('not.exist');
});

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err) => {
  console.error('Uncaught exception:', err.message);
  return false;
});

// Protect the Cypress UI window from app-driven parent/top navigation.
Cypress.on('window:before:load', (win) => {
  if (Cypress.env('E2E_SILENCE_INFO_LOGS')) {
    win.console.info = () => {};
  }

  try {
    Object.defineProperty(win, 'top', {
      get: () => win,
      set: () => {
        console.warn('[Cypress] Blocked attempt to set window.top');
      },
      configurable: false,
    });

    Object.defineProperty(win, 'parent', {
      get: () => win,
      set: () => {
        console.warn('[Cypress] Blocked attempt to set window.parent');
      },
      configurable: false,
    });
  } catch (e) {
    console.warn('[Cypress] Could not override window properties:', e);
  }
});

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login by setting a signed `_session` cookie and caching it via cy.session().
       * Uses ACCESS_TOKEN / SUB env vars unless overridden. The user must be in the staff group.
       * @example cy.login()
       * @example cy.login({ accessToken: 'token', sub: 'user-id' })
       */
      login(options?: { accessToken?: string; sub?: string }): Chainable<void>;

      /**
       * Logout via the UI (user menu → Log Out).
       * @example cy.logout()
       */
      logout(): Chainable<void>;
    }
  }
}

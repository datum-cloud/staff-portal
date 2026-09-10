import { isEmailVerified, UserIdentityCard, UserRecoveryLinksCard } from '@/features/user';
import { httpClient } from '@/modules/axios/axios.client';
import { AppProvider } from '@/providers/app.provider';
import UserDetailPage from '@/routes/customer/user/detail/index';
import { RHFAdapter } from '@datum-cloud/datum-ui/form/adapters/rhf';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { client } from '@openapi/shared/client.gen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mount } from 'cypress/react';
import { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

// These components call useEnv(), which reads useMatches() — a DATA router is required,
// so the support file's plain MemoryRouter mount will not do. Everything else matches it.
const testQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

const mountInDataRouter = (node: ReactNode, staffUserName = 'staff-1') => {
  client.setConfig({ axios: httpClient });
  const router = createMemoryRouter(
    [{ id: 'root', path: '/', loader: () => ({ ENV: {} }), element: node }],
    { initialEntries: ['/'] }
  );
  return mount(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={testQueryClient()}>
        <AppProvider user={{ metadata: { name: staffUserName }, spec: { email: 's@datum.net' } }}>
          <RHFAdapter>
            <RouterProvider router={router} />
          </RHFAdapter>
        </AppProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
};

const verifiedUser = (verified: boolean): ComMiloapisIamV1Alpha1User => ({
  metadata: { name: 'u1', creationTimestamp: '2026-09-01T10:00:00Z' },
  spec: { email: 'ada@example.com', givenName: 'Ada', familyName: 'Lovelace' },
  status: {
    conditions: verified
      ? [
          {
            type: 'EmailVerified',
            status: 'True',
            reason: 'VerifiedByAuthProvider',
            message: '',
            lastTransitionTime: '2026-09-01T10:00:00Z',
          },
        ]
      : [],
  },
});

const proxyList = (items: unknown[]) => ({
  statusCode: 200,
  body: { code: 'OK', path: '/x', data: { items } },
});

const recoveryEmail = (name: string, requester: string, reason: string, when: string) => ({
  metadata: {
    name,
    namespace: 'milo-system',
    creationTimestamp: when,
    annotations: {
      'identity.miloapis.com/recovery-requester': requester,
      'identity.miloapis.com/recovery-reason': reason,
    },
  },
});

describe('Account recovery on the user detail page', () => {
  describe('isEmailVerified', () => {
    it('is true only when the EmailVerified condition reads True', () => {
      expect(isEmailVerified(verifiedUser(true))).to.equal(true);
    });

    it('is false when the condition is absent — an older user nobody has swept yet', () => {
      expect(isEmailVerified(verifiedUser(false))).to.equal(false);
      expect(isEmailVerified({})).to.equal(false);
    });

    it('is false when the condition reads False', () => {
      expect(
        isEmailVerified({
          status: {
            conditions: [
              {
                type: 'EmailVerified',
                status: 'False',
                reason: 'NotVerified',
                message: '',
                lastTransitionTime: '2026-09-01T10:00:00Z',
              },
            ],
          },
        })
      ).to.equal(false);
    });

    it('ignores other conditions that happen to read True', () => {
      expect(
        isEmailVerified({
          status: {
            conditions: [
              {
                type: 'Ready',
                status: 'True',
                reason: 'Ready',
                message: '',
                lastTransitionTime: '2026-09-01T10:00:00Z',
              },
            ],
          },
        })
      ).to.equal(false);
    });
  });

  describe('UserIdentityCard — what support sees before sending', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/useridentities*', proxyList([]));
    });

    it('shows the passkey count and a Verified badge', () => {
      mountInDataRouter(<UserIdentityCard userId="u1" readOnly passkeyCount={2} emailVerified />);
      cy.contains('2 passkeys').should('be.visible');
      cy.contains('Verified').should('be.visible');
    });

    it('says Unverified when the condition is not True', () => {
      mountInDataRouter(
        <UserIdentityCard userId="u1" readOnly passkeyCount={0} emailVerified={false} />
      );
      cy.contains('Unverified').should('be.visible');
      cy.contains('0 passkeys').should('be.visible');
    });

    it('renders "1 passkey" in the singular', () => {
      mountInDataRouter(<UserIdentityCard userId="u1" readOnly passkeyCount={1} emailVerified />);
      cy.contains('1 passkey').should('be.visible');
    });

    it('leaves the summary out entirely when neither fact was passed', () => {
      mountInDataRouter(<UserIdentityCard userId="u1" readOnly />);
      cy.contains('passkey').should('not.exist');
      cy.contains('Unverified').should('not.exist');
    });
  });

  describe('UserRecoveryLinksCard — the links-sent history', () => {
    it('lists each sent link with its requester, reason and time', () => {
      cy.intercept(
        'GET',
        '**/emails*',
        proxyList([
          recoveryEmail('account-recovery-aaa', 'staff-1', 'ticket 42', '2026-09-09T08:00:00Z'),
          recoveryEmail('account-recovery-bbb', 'staff-2', 'phone call', '2026-09-08T08:00:00Z'),
        ])
      ).as('listEmails');

      mountInDataRouter(<UserRecoveryLinksCard userId="u1" />);
      cy.wait('@listEmails');

      cy.contains('staff-1').should('be.visible');
      cy.contains('ticket 42').should('be.visible');
      cy.contains('staff-2').should('be.visible');
      cy.contains('phone call').should('be.visible');
    });

    it('never shows a code — only who asked, why, and when', () => {
      cy.intercept(
        'GET',
        '**/emails*',
        proxyList([
          recoveryEmail('account-recovery-aaa', 'staff-1', 'ticket 42', '2026-09-09T08:00:00Z'),
        ])
      ).as('listEmails');

      mountInDataRouter(<UserRecoveryLinksCard userId="u1" />);
      cy.wait('@listEmails');
      cy.get('[data-slot="section-card"]').should('not.contain.text', 'Code');
    });

    it('warns that the list is truncated when the server says there is more', () => {
      cy.intercept('GET', '**/emails*', {
        statusCode: 200,
        body: {
          code: 'OK',
          path: '/x',
          data: {
            items: [
              recoveryEmail('account-recovery-aaa', 'staff-1', 'ticket 42', '2026-09-09T08:00:00Z'),
            ],
            metadata: { continue: 'opaque-token' },
          },
        },
      }).as('listEmails');

      mountInDataRouter(<UserRecoveryLinksCard userId="u1" />);
      cy.wait('@listEmails');
      cy.contains('Showing the most recent 1').should('be.visible');
      cy.contains('older links exist').should('be.visible');
    });

    it('says nothing about truncation when the server returned everything', () => {
      cy.intercept(
        'GET',
        '**/emails*',
        proxyList([
          recoveryEmail('account-recovery-aaa', 'staff-1', 'ticket 42', '2026-09-09T08:00:00Z'),
        ])
      ).as('listEmails');

      mountInDataRouter(<UserRecoveryLinksCard userId="u1" />);
      cy.wait('@listEmails');
      cy.contains('older links exist').should('not.exist');
    });

    it('shows an empty state when no link has been sent', () => {
      cy.intercept('GET', '**/emails*', proxyList([])).as('listEmails');
      mountInDataRouter(<UserRecoveryLinksCard userId="u1" />);
      cy.wait('@listEmails');
      cy.contains('No recovery links have been sent').should('be.visible');
    });
  });

  describe('The action on the page', () => {
    const mountPage = (verified: boolean) => {
      cy.intercept('GET', '**/useridentities*', proxyList([]));
      cy.intercept('GET', '**/passkeys*', proxyList([{ metadata: { name: 'pk-1' } }]));
      cy.intercept('GET', '**/emails*', proxyList([]));
      cy.intercept('GET', '**/fraudevaluations*', proxyList([]));
      cy.intercept('GET', '**/platformaccesses*', proxyList([]));
      cy.intercept('POST', '**/graphql*', { statusCode: 200, body: { data: { sessions: [] } } });

      // The page reads its user from useRouteLoaderData('user-detail'), so the route has
      // to carry that id — which is why this builds its own data router rather than using
      // the shared RemixStub.
      client.setConfig({ axios: httpClient });
      const router = createMemoryRouter(
        [
          {
            id: 'root',
            path: '/',
            loader: () => ({ ENV: {} }),
            children: [
              {
                id: 'user-detail',
                index: true,
                loader: () => verifiedUser(verified),
                element: <UserDetailPage />,
              },
            ],
          },
        ],
        { initialEntries: ['/'] }
      );

      return mount(
        <I18nProvider i18n={i18n}>
          <QueryClientProvider client={testQueryClient()}>
            <AppProvider user={{ metadata: { name: 'staff-1' }, spec: { email: 's@datum.net' } }}>
              <RHFAdapter>
                <RouterProvider router={router} />
              </RHFAdapter>
            </AppProvider>
          </QueryClientProvider>
        </I18nProvider>
      );
    };

    it('offers the action and opens the reason dialog', () => {
      mountPage(true);
      cy.contains('button', 'Send passkey recovery link').should('not.be.disabled').click();
      cy.get('[role="dialog"]').should('contain.text', 'cannot be recalled');
    });

    it('disables the action for an unverified address and says why', () => {
      mountPage(false);
      cy.contains('button', 'Send passkey recovery link').should('be.disabled');
      // Radix opens on pointer events, and a disabled button swallows them — the tooltip
      // trigger is the span wrapping it, which is why the hover goes there.
      cy.contains('button', 'Send passkey recovery link')
        .parent()
        .trigger('pointerenter', { eventConstructor: 'PointerEvent' })
        .trigger('pointermove', { eventConstructor: 'PointerEvent' });
      cy.contains('Email not verified').should('exist');
    });

    it('shows the passkey count and verified badge read from the live queries', () => {
      mountPage(true);
      cy.contains('1 passkey').should('be.visible');
      cy.contains('Verified').should('be.visible');
    });

    it('shows the links-sent history card', () => {
      mountPage(true);
      cy.contains('No recovery links have been sent').should('be.visible');
    });
  });
});

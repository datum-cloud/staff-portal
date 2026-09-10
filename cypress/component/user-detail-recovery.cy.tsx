import { emailVerificationState, UserIdentityCard, UserRecoveryLinksCard } from '@/features/user';
import { httpClient } from '@/modules/axios/axios.client';
import { AppProvider } from '@/providers/app.provider';
import UserDetailPage from '@/routes/customer/user/detail/index';
import { RHFAdapter } from '@datum-cloud/datum-ui/form/adapters/rhf';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { UserWithEmailVerification } from '@openapi/iam.miloapis.com/v1alpha1/pending-phase-c';
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

// Omit the argument for the user milo has not synced yet — the field is simply absent.
const userWith = (emailVerification?: 'Verified' | 'Unverified'): UserWithEmailVerification => ({
  metadata: { name: 'u1', creationTimestamp: '2026-09-01T10:00:00Z' },
  spec: { email: 'ada@example.com', givenName: 'Ada', familyName: 'Lovelace' },
  status: emailVerification ? { emailVerification } : {},
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
  describe('emailVerificationState', () => {
    it('reads Verified from status.emailVerification', () => {
      expect(emailVerificationState(userWith('Verified'))).to.equal('Verified');
    });

    it('reads Unverified from status.emailVerification', () => {
      expect(emailVerificationState(userWith('Unverified'))).to.equal('Unverified');
    });

    it('is NotSynced when the field is absent — the provider has not written one yet', () => {
      expect(emailVerificationState(userWith())).to.equal('NotSynced');
      expect(emailVerificationState({})).to.equal('NotSynced');
    });

    it('ignores the retired EmailVerified condition', () => {
      expect(
        emailVerificationState({
          status: {
            conditions: [
              {
                type: 'EmailVerified',
                status: 'True',
                reason: 'VerifiedByAuthProvider',
                message: '',
                lastTransitionTime: '2026-09-01T10:00:00Z',
              },
            ],
          },
        })
      ).to.equal('NotSynced');
    });
  });

  describe('UserIdentityCard — what support sees before sending', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/useridentities*', proxyList([]));
    });

    it('shows the passkey count and a Verified badge', () => {
      mountInDataRouter(
        <UserIdentityCard userId="u1" readOnly passkeyCount={2} emailVerification="Verified" />
      );
      cy.contains('2 passkeys').should('be.visible');
      cy.contains('Verified').should('be.visible');
    });

    it('says Unverified when the field reads Unverified', () => {
      mountInDataRouter(
        <UserIdentityCard userId="u1" readOnly passkeyCount={0} emailVerification="Unverified" />
      );
      cy.contains('Unverified').should('be.visible');
      cy.contains('0 passkeys').should('be.visible');
    });

    it('says Not synced when milo has not written the field yet', () => {
      mountInDataRouter(
        <UserIdentityCard userId="u1" readOnly passkeyCount={0} emailVerification="NotSynced" />
      );
      cy.contains('Not synced').should('be.visible');
      // The distinction is the point: support must not read this as "never verified".
      cy.contains('Unverified').should('not.exist');
    });

    it('renders "1 passkey" in the singular', () => {
      mountInDataRouter(
        <UserIdentityCard userId="u1" readOnly passkeyCount={1} emailVerification="Verified" />
      );
      cy.contains('1 passkey').should('be.visible');
    });

    it('leaves the summary out entirely when neither fact was passed', () => {
      mountInDataRouter(<UserIdentityCard userId="u1" readOnly />);
      cy.contains('passkey').should('not.exist');
      cy.contains('Unverified').should('not.exist');
      cy.contains('Not synced').should('not.exist');
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
    const mountPage = (emailVerification?: 'Verified' | 'Unverified') => {
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
                loader: () => userWith(emailVerification),
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
      mountPage('Verified');
      cy.contains('button', 'Send passkey recovery link').should('not.be.disabled').click();
      cy.get('[role="dialog"]').should('contain.text', 'cannot be recalled');
    });

    it('disables the action for an unverified address and says why', () => {
      mountPage('Unverified');
      cy.contains('button', 'Send passkey recovery link').should('be.disabled');
      // Radix opens on pointer events, and a disabled button swallows them — the tooltip
      // trigger is the span wrapping it, which is why the hover goes there.
      cy.contains('button', 'Send passkey recovery link')
        .parent()
        .trigger('pointerenter', { eventConstructor: 'PointerEvent' })
        .trigger('pointermove', { eventConstructor: 'PointerEvent' });
      cy.contains('Email not verified').should('exist');
    });

    it('disables the action while the field is unsynced, and says so on the badge', () => {
      mountPage();
      cy.contains('Not synced').should('be.visible');
      cy.contains('button', 'Send passkey recovery link').should('be.disabled');
    });

    it('shows the passkey count and verified badge read from the live queries', () => {
      mountPage('Verified');
      cy.contains('1 passkey').should('be.visible');
      cy.contains('Verified').should('be.visible');
    });

    it('shows the links-sent history card', () => {
      mountPage('Verified');
      cy.contains('No recovery links have been sent').should('be.visible');
    });
  });
});

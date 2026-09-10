import { httpClient, PROXY_URL } from '@/modules/axios/axios.client';
import {
  passkeyListQuery,
  passkeyRegistrationLinkCreateMutation,
  recoveryEmailListQuery,
} from '@/resources/request/client';
import { client } from '@openapi/shared/client.gen';

// Exercises the REAL generated client (no module mocking) and asserts the request it
// builds. entry.client.tsx is what binds the proxy-aware axios instance in the app; a
// component test has no entry point, so bind the same one here.
describe('identity API — passkey recovery', () => {
  beforeEach(() => {
    client.setConfig({ axios: httpClient });
  });

  const controlPlane = (userId: string) =>
    `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`;

  describe('passkeyListQuery', () => {
    it("lists passkeys under the user's control plane, scoped by the userUID field selector", () => {
      cy.intercept('GET', '**/passkeys*', {
        statusCode: 200,
        body: { code: 'OK', path: '/passkeys', data: { items: [] } },
      }).as('listPasskeys');

      cy.wrap(passkeyListQuery('u1'));

      cy.wait('@listPasskeys').then(({ request }) => {
        const url = new URL(request.url);
        expect(url.pathname).to.equal(
          `${controlPlane('u1')}/apis/identity.miloapis.com/v1alpha1/passkeys`
        );
        expect(url.searchParams.get('fieldSelector')).to.equal('status.userUID=u1');
      });
    });

    it('unwraps the proxy envelope and returns the list', () => {
      cy.intercept('GET', '**/passkeys*', {
        statusCode: 200,
        body: {
          code: 'OK',
          path: '/passkeys',
          data: {
            apiVersion: 'identity.miloapis.com/v1alpha1',
            kind: 'PasskeyList',
            items: [{ metadata: { name: 'pk-1' }, status: { displayName: 'MacBook' } }],
          },
        },
      }).as('listPasskeys');

      cy.wrap(passkeyListQuery('u1')).then((result) => {
        expect((result as { items: unknown[] }).items).to.have.length(1);
      });
    });
  });

  describe('passkeyRegistrationLinkCreateMutation', () => {
    it('POSTs a PasskeyRegistrationLink naming the target user, the requester and the reason', () => {
      cy.intercept('POST', '**/passkeyregistrationlinks*', {
        statusCode: 201,
        body: {
          code: 'Created',
          path: '/passkeyregistrationlinks',
          data: { metadata: { name: 'passkey-recovery-abc' }, status: { emailName: 'e-1' } },
        },
      }).as('createLink');

      cy.wrap(
        passkeyRegistrationLinkCreateMutation('u1', { requestedBy: 'staff-1', reason: 'ticket 42' })
      );

      cy.wait('@createLink').then(({ request }) => {
        expect(new URL(request.url).pathname).to.equal(
          `${controlPlane('u1')}/apis/identity.miloapis.com/v1alpha1/passkeyregistrationlinks`
        );
        expect(request.body).to.deep.equal({
          apiVersion: 'identity.miloapis.com/v1alpha1',
          kind: 'PasskeyRegistrationLink',
          metadata: { generateName: 'passkey-recovery-' },
          spec: {
            userRef: { name: 'u1' },
            requestedBy: 'staff-1',
            reason: 'ticket 42',
          },
        });
      });
    });

    it('never carries a code: the request body holds only the spec the server needs', () => {
      cy.intercept('POST', '**/passkeyregistrationlinks*', {
        statusCode: 201,
        body: { code: 'Created', path: '/passkeyregistrationlinks', data: {} },
      }).as('createLink');

      cy.wrap(
        passkeyRegistrationLinkCreateMutation('u1', { requestedBy: 'staff-1', reason: 'ticket 42' })
      );

      cy.wait('@createLink').then(({ request }) => {
        expect(JSON.stringify(request.body)).not.to.match(/code/i);
      });
    });
  });

  describe('recoveryEmailListQuery', () => {
    it('lists the labelled recovery Emails across namespaces', () => {
      cy.intercept('GET', '**/emails*', {
        statusCode: 200,
        body: { code: 'OK', path: '/emails', data: { items: [] } },
      }).as('listEmails');

      cy.wrap(recoveryEmailListQuery('u1'));

      cy.wait('@listEmails').then(({ request }) => {
        const url = new URL(request.url);
        expect(url.pathname).to.equal(
          `${PROXY_URL}/apis/notification.miloapis.com/v1alpha1/emails`
        );
        expect(url.searchParams.get('labelSelector')).to.equal(
          'identity.miloapis.com/user=u1,identity.miloapis.com/recovery-requested-by=support'
        );
        // Raised well above the 20 the history card can meaningfully show, because the
        // limit is applied server-side before the client sorts by time — a low cap would
        // hand us an arbitrary subset.
        expect(url.searchParams.get('limit')).to.equal('200');
      });
    });
  });
});

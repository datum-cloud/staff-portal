import { UserRecoveryLinkDialog } from '@/features/user';
import { httpClient } from '@/modules/axios/axios.client';
import { messages } from '@/modules/i18n/locales/en';
import { AppProvider } from '@/providers/app.provider';
import { RHFAdapter } from '@datum-cloud/datum-ui/form/adapters/rhf';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { client } from '@openapi/shared/client.gen';

// Renders the REAL dialog, hook and generated client (no module mocking); only the
// network is stubbed, so each server outcome is exercised the way support would meet it.
describe('UserRecoveryLinkDialog', () => {
  const targetUser: ComMiloapisIamV1Alpha1User = {
    metadata: { name: 'u1' },
    spec: { email: 'ada@example.com', givenName: 'Ada', familyName: 'Lovelace' },
  };
  const staffUser: ComMiloapisIamV1Alpha1User = {
    metadata: { name: 'staff-1' },
    spec: { email: 'support@datum.net', givenName: 'Sam', familyName: 'Support' },
  };

  const mountDialog = () => {
    client.setConfig({ axios: httpClient });
    cy.mount(
      <AppProvider user={staffUser}>
        <RHFAdapter>
          <UserRecoveryLinkDialog
            open
            user={targetUser}
            onOpenChange={cy.stub().as('onOpenChange')}
            onSuccess={cy.stub().as('onSuccess').resolves()}
          />
        </RHFAdapter>
      </AppProvider>
    );
  };

  const interceptCreate = (statusCode: number, error: string) =>
    cy
      .intercept('POST', '**/passkeyregistrationlinks*', {
        statusCode,
        body: { requestId: 'req-1', code: 'API_REQUEST_FAILED', error, path: '/x' },
      })
      .as('createLink');

  describe('Copy', () => {
    it('states that the link goes only to the verified address on file', () => {
      mountDialog();
      cy.get('[role="dialog"]').should('contain.text', 'verified address on file');
    });

    it('states the expiry and that the link cannot be recalled', () => {
      mountDialog();
      cy.get('[role="dialog"]').should('contain.text', 'about an hour');
      cy.get('[role="dialog"]').should('contain.text', 'cannot be recalled');
    });

    it('never offers the code itself — only the reason field', () => {
      mountDialog();
      cy.get('[role="dialog"]').should('not.contain.text', 'Code');
    });
  });

  describe('The reason is required', () => {
    it('blocks submission until a reason is given', () => {
      cy.intercept('POST', '**/passkeyregistrationlinks*', cy.spy().as('neverCalled'));
      mountDialog();
      cy.contains('button', 'Send link').should('be.disabled');
      cy.get('@neverCalled').should('not.have.been.called');
    });

    it('enables submission once a reason is typed', () => {
      mountDialog();
      cy.get('[role="dialog"]').find('input, textarea').first().type('ticket 42');
      cy.contains('button', 'Send link').should('not.be.disabled');
    });

    it('shows the minimum-length message while the reason is too short', () => {
      mountDialog();
      cy.get('[role="dialog"]').find('input, textarea').first().type('abc');
      cy.get('[role="dialog"]').should('contain.text', 'Reason must be at least 5 characters');
    });

    it('carries that message in the translation catalog like every other string', () => {
      // The message is rendered verbatim by datum-ui's RHF adapter, so a raw template
      // literal would reach a French-locale user in English. Being in the catalog is the
      // only thing that proves it went through the `t` macro.
      const inCatalog = Object.values(messages).some((entry) =>
        JSON.stringify(entry).includes('Reason must be at least')
      );
      expect(inCatalog, 'minimum-length message is in the compiled en catalog').to.equal(true);
    });
  });

  describe('Submitting', () => {
    it('creates the link naming the signed-in staff user as the requester', () => {
      cy.intercept('POST', '**/passkeyregistrationlinks*', {
        statusCode: 201,
        body: {
          code: 'Created',
          path: '/x',
          data: { metadata: { name: 'passkey-recovery-abc' }, status: { emailName: 'e-1' } },
        },
      }).as('createLink');

      mountDialog();
      cy.get('[role="dialog"]').find('input, textarea').first().type('ticket 42');
      cy.contains('button', 'Send link').click();

      cy.wait('@createLink').then(({ request }) => {
        expect(request.body.spec).to.deep.equal({
          userRef: { name: 'u1' },
          requestedBy: 'staff-1',
          reason: 'ticket 42',
        });
      });
      cy.get('@onSuccess').should('have.been.calledOnce');
    });
  });

  describe('Server outcomes are surfaced, never swallowed', () => {
    const submit = () => {
      mountDialog();
      cy.get('[role="dialog"]').find('input, textarea').first().type('ticket 42');
      cy.contains('button', 'Send link').click();
      cy.wait('@createLink');
    };

    it('renders a plain explanation when recovery links are disabled (503)', () => {
      interceptCreate(503, 'recovery links are disabled (--recovery-links-enabled=false)');
      submit();
      cy.get('[role="dialog"]').should('contain.text', 'Recovery links are disabled');
      cy.get('@onOpenChange').should('not.have.been.calledWith', false);
    });

    it('renders a permission message when the caller is not authorized (403)', () => {
      interceptCreate(403, 'not authorized to send a recovery link to user "u1"');
      submit();
      cy.get('[role="dialog"]').should('contain.text', 'not authorized');
      cy.get('@onOpenChange').should('not.have.been.calledWith', false);
    });

    it("renders the server's own words when the address is unverified (400)", () => {
      interceptCreate(
        400,
        "the user's email address is not verified; ask them to sign up again to receive a verification link"
      );
      submit();
      cy.get('[role="dialog"]').should('contain.text', 'is not verified');
      cy.get('[role="dialog"]').should('contain.text', 'sign up again');
      cy.get('@onOpenChange').should('not.have.been.calledWith', false);
    });

    it('keeps the typed reason so support can retry without re-typing', () => {
      interceptCreate(503, 'recovery links are disabled (--recovery-links-enabled=false)');
      submit();
      cy.get('[role="dialog"]').find('input, textarea').first().should('have.value', 'ticket 42');
    });
  });
});

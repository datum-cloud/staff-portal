import { EditContactDialog } from '@/features/billing/components/billing-contact/edit-contact-dialog';
import type { BillingAccount } from '@/features/billing/utils';
import { RHFAdapter } from '@datum-cloud/datum-ui/form/adapters/rhf';

const account = {
  apiVersion: 'billing.miloapis.com/v1alpha1',
  kind: 'BillingAccount',
  metadata: { name: 'acme', namespace: 'organization-acme', resourceVersion: '1' },
  spec: {
    currencyCode: 'USD',
    contactInfo: {
      name: 'Jane Doe',
      email: 'jane@acme.example',
      businessName: 'Acme Ltd',
      invoiceEmails: ['ap@acme.example'],
      address: { country: 'GB', line1: '1 Main St', city: 'London', postalCode: 'N1 1AA' },
    },
    taxIds: [{ type: 'gb_vat', value: 'GB123456789' }],
  },
} as BillingAccount;

const PATCH_URL = '**/billingaccounts/acme*';

function mountDialog(onClose = cy.stub().as('close')) {
  // The app wraps every form in RHFAdapter (app/root.tsx).
  cy.mount(
    <RHFAdapter>
      <EditContactDialog orgName="acme" account={account} onClose={onClose} />
    </RHFAdapter>
  );
}

describe('EditContactDialog', () => {
  beforeEach(() => cy.viewport(1280, 900));

  it('starts from the account, with the contact email required', () => {
    mountDialog();
    cy.get('input[name="email"]').should('have.value', 'jane@acme.example');
    cy.get('input[name="invoiceEmail"]').should('have.value', 'ap@acme.example');
    cy.get('input[name="taxIds.0.value"]').should('have.value', 'GB123456789');
    cy.contains('label', 'Contact email').find('[aria-hidden="true"]').should('have.text', '*');
    cy.contains('label', 'Invoice email').find('[aria-hidden="true"]').should('not.exist');
  });

  it('names the contact email as typed in the invoice email help', () => {
    mountDialog();
    cy.contains('Empty sends them to the contact email (jane@acme.example).').should('exist');
    cy.get('input[name="email"]').clear().type('billing@acme.example');
    cy.contains('Empty sends them to the contact email (billing@acme.example).').should('exist');
  });

  it('closes without saving when nothing changed', () => {
    cy.intercept('PATCH', PATCH_URL, cy.spy().as('patch'));
    mountDialog();
    cy.contains('button', 'Save').click();
    cy.get('@close').should('have.been.calledOnce');
    cy.get('@patch').should('not.have.been.called');
  });

  it('patches contactInfo and taxIds, with null for cleared fields', () => {
    cy.intercept('PATCH', PATCH_URL, { statusCode: 200, body: { data: account } }).as('patch');
    mountDialog();
    cy.get('input[name="email"]').clear().type('billing@acme.example');
    cy.get('input[name="businessName"]').clear();
    cy.get('input[name="invoiceEmail"]').clear();
    cy.contains('button', 'Save').click();
    cy.wait('@patch').then(({ request }) => {
      expect(request.headers['content-type']).to.contain('application/merge-patch+json');
      expect(request.body).to.deep.equal({
        spec: {
          contactInfo: {
            email: 'billing@acme.example',
            name: 'Jane Doe',
            businessName: null,
            invoiceEmails: [],
            address: {
              country: 'GB',
              line1: '1 Main St',
              line2: null,
              city: 'London',
              region: null,
              postalCode: 'N1 1AA',
            },
          },
          taxIds: [{ type: 'gb_vat', value: 'GB123456789' }],
        },
      });
    });
    cy.get('@close').should('have.been.calledOnce');
  });

  it('puts billing’s refusals on their fields, and the rest above the buttons', () => {
    cy.intercept('PATCH', PATCH_URL, {
      statusCode: 422,
      body: {
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        reason: 'Invalid',
        code: 422,
        message:
          'admission webhook "vbillingaccount.kb.io" denied the request: BillingAccount.billing.miloapis.com "acme" is invalid',
        details: {
          causes: [
            {
              field: 'spec.contactInfo.email',
              reason: 'FieldValueInvalid',
              message: 'Invalid value: "billing@acme.example": must be a valid email address',
            },
            {
              field: 'spec.taxIds[0].type',
              reason: 'FieldValueDuplicate',
              message: 'Duplicate value: "gb_vat"',
            },
            {
              field: 'spec.paymentTerms',
              reason: 'FieldValueForbidden',
              message: "Forbidden: paymentTerms can't be changed",
            },
          ],
        },
      },
    }).as('patch');
    mountDialog();
    cy.get('input[name="email"]').clear().type('billing@acme.example');
    cy.contains('button', 'Save').click();
    cy.wait('@patch');
    cy.contains('Must be a valid email address').should('be.visible');
    cy.contains('The account already has a tax ID of this type')
      .scrollIntoView()
      .should('be.visible');
    cy.get('[role="alert"]').should('contain.text', "PaymentTerms can't be changed");
    cy.get('@close').should('not.have.been.called');
  });

  it('refuses an empty contact email before sending', () => {
    cy.intercept('PATCH', PATCH_URL, cy.spy().as('patch'));
    mountDialog();
    cy.get('input[name="email"]').clear();
    cy.contains('button', 'Save').click();
    cy.contains('Enter an email for the billing contact').should('be.visible');
    cy.get('@patch').should('not.have.been.called');
  });
});

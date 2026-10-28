import { ApplicationReview } from '@/features/billing';
import type { BillingArrangementApplication } from '@/features/billing/lib/payment-terms-applications';
import { httpClient } from '@/modules/axios/axios.client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { RHFAdapter } from '@datum-cloud/datum-ui/form/adapters/rhf';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { client } from '@openapi/shared/client.gen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mount } from 'cypress/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

const testQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

const mountReview = () => {
  client.setConfig({ axios: httpClient });
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <ApplicationReview orgName="acme" applicationName="apply-acme-1" />,
      },
    ],
    { initialEntries: ['/'] }
  );
  return mount(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={testQueryClient()}>
        <RHFAdapter>
          <RouterProvider router={router} />
        </RHFAdapter>
      </QueryClientProvider>
    </I18nProvider>
  );
};

/** The form control a label points at. */
const field = (label: string) =>
  cy
    .contains('label', label)
    .invoke('attr', 'for')
    .then((id) => cy.get(`[id="${id}"]`));

const proxy = (data: unknown, statusCode = 200) => ({
  statusCode,
  body: { code: 'OK', path: '/x', data },
});

const application = (
  status?: BillingArrangementApplication['status']
): BillingArrangementApplication => ({
  metadata: {
    name: 'apply-acme-1',
    namespace: 'organization-acme',
    creationTimestamp: '2026-10-02T09:00:00Z',
  },
  spec: {
    billingAccountRef: { name: 'acme-billing' },
    paymentOption: 'Invoice',
    organization: { legalName: 'Acme Corp Ltd', type: 'Company', website: 'https://acme.com' },
    situation: 'Our company pays software vendors by purchase order on net-30 terms.',
    invoice: {
      estimatedMonthlySpend: 'From2500To10000',
      accountsPayableEmail: 'ap@acme.com',
      purchaseOrderNumber: 'PO-4471',
    },
    authorized: true,
    applicant: { username: 'jane@acme.com', uid: 'user-1' },
  },
  status,
});

const stubAccount = (arrangements: unknown[] = []) => {
  cy.intercept(
    'GET',
    '**/namespaces/organization-acme/billingaccounts/acme-billing*',
    proxy({
      metadata: { name: 'acme-billing', namespace: 'organization-acme' },
      spec: {
        currencyCode: 'USD',
        contactInfo: {
          name: 'Jane Doe',
          email: 'jane@acme.com',
          address: { line1: '1 Main St', city: 'Austin', region: 'TX', country: 'US' },
        },
      },
      status: {
        conditions: [
          {
            type: 'PaymentReady',
            status: 'False',
            reason: 'ApplicationPending',
            message: 'A payment terms application is under review',
            lastTransitionTime: '2026-10-02T09:00:00Z',
          },
        ],
      },
    })
  );
  cy.intercept(
    'GET',
    '**/namespaces/organization-acme/billingarrangements*',
    proxy({ items: arrangements })
  );
  cy.intercept('GET', '**/fraudevaluations*', proxy({ items: [] }));
  cy.intercept('POST', '**/graphql*', { statusCode: 500, body: {} });
};

/** Net 30 terms for the account, active since January. */
const currentTerms = (endsAt?: string) => ({
  metadata: { name: 'acme-billing-terms-old', creationTimestamp: '2026-01-01T00:00:00Z' },
  spec: {
    billingAccountRef: { name: 'acme-billing' },
    type: 'Invoice',
    invoice: { netDays: 30, creditLimit: '10000' },
    startsAt: '2026-01-01T00:00:00Z',
    endsAt,
    reason: 'Signed MSA',
  },
});

const stubPendingApplication = () =>
  cy.intercept(
    'GET',
    '**/namespaces/organization-acme/billingarrangementapplications/apply-acme-1*',
    proxy(application())
  );

describe('ApplicationReview', () => {
  beforeEach(() => cy.viewport(1280, 1000));

  it('shows what the customer sent and approves with terms that name the application', () => {
    stubAccount();
    cy.intercept(
      'GET',
      '**/namespaces/organization-acme/billingarrangementapplications/apply-acme-1*',
      proxy(application())
    );
    cy.intercept(
      'POST',
      '**/namespaces/organization-acme/billingarrangements*',
      proxy({ metadata: { name: 'acme-billing-terms-x' } }, 201)
    ).as('approve');
    cy.intercept('GET', '**/fraudevaluations*', proxy({ items: [] })).as('fraud');

    mountReview();

    // Only the applicant's fraud evaluations are fetched.
    cy.wait('@fraud')
      .its('request.url')
      .should((url: string) => {
        expect(new URL(url).searchParams.get('fieldSelector')).to.equal('spec.userRef.name=user-1');
      });
    cy.contains('h1', 'Acme Corp Ltd').should('exist');
    cy.contains('a', 'https://acme.com').should('have.attr', 'href', 'https://acme.com/');
    cy.contains('$2,500–$10,000').should('exist');
    cy.contains('net-30 terms').should('exist');
    cy.contains('1 Main St').should('exist');
    cy.screenshot('application-review-pending', { capture: 'fullPage' });

    cy.get('[data-e2e="application-approve"]').click();
    field('Accounts payable email').should('have.value', 'ap@acme.com');
    field('PO number').should('have.value', 'PO-4471');
    field('Credit limit').type('10000');
    field('Reason').type('Verified company and website');
    cy.get('[role="dialog"]').contains('button', 'Approve').click();

    cy.wait('@approve')
      .its('request.body.spec')
      .should((spec) => {
        expect(spec.applicationRef).to.deep.equal({ name: 'apply-acme-1' });
        expect(spec.billingAccountRef).to.deep.equal({ name: 'acme-billing' });
        expect(spec.invoice).to.include({
          netDays: 30,
          creditLimit: '10000',
          accountsPayableEmail: 'ap@acme.com',
          purchaseOrderNumber: 'PO-4471',
        });
      });
  });

  it("shows a website that isn't an http(s) URL as text, not a link", () => {
    stubAccount();
    const sent = application();
    sent.spec!.organization.website = 'acme.com';
    cy.intercept(
      'GET',
      '**/namespaces/organization-acme/billingarrangementapplications/apply-acme-1*',
      proxy(sent)
    );

    mountReview();

    cy.contains(/^acme\.com$/).should('exist');
    cy.get('a[href*="acme.com"]').should('not.exist');
  });

  it('renews terms that have an end date from the day they end', () => {
    // Far enough out that the terms stay active whenever this runs.
    stubAccount([currentTerms('2099-01-01T00:00:00Z')]);
    stubPendingApplication();
    cy.intercept(
      'POST',
      '**/namespaces/organization-acme/billingarrangements*',
      proxy({ metadata: { name: 'acme-billing-terms-x' } }, 201)
    ).as('approve');

    mountReview();

    cy.get('[data-e2e="application-current-terms"]')
      .should('contain.text', 'Net 30, active until')
      .and('contain.text', 'Approving renews them')
      .and('not.contain.text', 'before approving');
    cy.screenshot('application-review-renewal');

    cy.get('[data-e2e="application-approve"]').click();
    field('Credit limit').type('10000');
    field('Reason').type('Renewing for 2099');
    cy.get('[role="dialog"]').contains('button', 'Approve').click();

    cy.wait('@approve')
      .its('request.body.spec.startsAt')
      .should('equal', '2099-01-01T00:00:00.000Z');
  });

  it("won't approve while the account has terms with no end date", () => {
    stubAccount([currentTerms()]);
    stubPendingApplication();

    mountReview();

    cy.get('[data-e2e="application-current-terms"]')
      .should('contain.text', 'Net 30, active with no end date.')
      .and(
        'contain.text',
        'To approve, give them an end date on the billing account: the new terms then start that day.'
      );
    cy.get('[data-e2e="application-current-terms"] a').should(
      'have.attr',
      'href',
      billingAccountRoutes.detail('acme', 'acme-billing')
    );
    cy.get('[data-e2e="application-approve"]').should('be.disabled');
    cy.screenshot('application-review-blocked');
  });

  it('declines with a message for the customer', () => {
    stubAccount();
    cy.intercept(
      'GET',
      '**/namespaces/organization-acme/billingarrangementapplications/apply-acme-1*',
      proxy(application())
    );
    cy.intercept(
      'POST',
      '**/namespaces/organization-acme/billingarrangementdeclines*',
      proxy({ metadata: { name: 'apply-acme-1-decline-x' } }, 201)
    ).as('decline');

    mountReview();

    cy.get('[data-e2e="application-decline"]').click();
    field('Message to the customer').type(
      "We couldn't verify your company. Add a card to continue."
    );
    field('Internal notes').type('Website was parked');
    cy.screenshot('application-review-decline-dialog');
    cy.get('[role="dialog"]').contains('button', 'Decline').click();

    cy.wait('@decline')
      .its('request.body.spec')
      .should('deep.equal', {
        applicationRef: { name: 'apply-acme-1' },
        message: "We couldn't verify your company. Add a card to continue.",
        internalNotes: 'Website was parked',
      });
  });

  it('shows why staff approved it', () => {
    stubAccount([
      {
        metadata: { name: 'acme-billing-terms-new', creationTimestamp: '2026-10-03T10:00:00Z' },
        spec: {
          billingAccountRef: { name: 'acme-billing' },
          applicationRef: { name: 'apply-acme-1' },
          type: 'Invoice',
          invoice: { netDays: 30 },
          startsAt: '2026-10-03T10:00:00Z',
          reason: 'Signed MSA, sales call 2026-10-01',
        },
      },
    ]);
    cy.intercept(
      'GET',
      '**/namespaces/organization-acme/billingarrangementapplications/apply-acme-1*',
      proxy(
        application({
          phase: 'Approved',
          decidedAt: '2026-10-03T10:00:00Z',
          arrangementRef: { name: 'acme-billing-terms-new' },
        })
      )
    );

    mountReview();

    cy.get('[data-e2e="application-approval-reason"]').should(
      'have.text',
      'Signed MSA, sales call 2026-10-01'
    );
    cy.contains('View the terms on the billing account').should('exist');
    // The approved terms have no end date, but they aren't in the way of anything.
    cy.get('[data-e2e="application-current-terms"]')
      .should('contain.text', 'Net 30, active with no end date.')
      .and('not.contain.text', 'To approve');
    cy.get('[data-e2e="application-approve"]').should('not.exist');
  });

  it('shows the decision once declined, without the actions', () => {
    stubAccount();
    cy.intercept(
      'GET',
      '**/namespaces/organization-acme/billingarrangementapplications/apply-acme-1*',
      proxy(
        application({
          phase: 'Declined',
          decidedAt: '2026-10-03T10:00:00Z',
          declineMessage: 'Add a card to continue.',
        })
      )
    );
    cy.intercept(
      'GET',
      '**/namespaces/organization-acme/billingarrangementdeclines*',
      proxy({
        items: [
          {
            metadata: { name: 'apply-acme-1-decline-x' },
            spec: {
              applicationRef: { name: 'apply-acme-1' },
              message: 'Add a card to continue.',
              internalNotes: 'Website was parked',
            },
          },
        ],
      })
    );

    mountReview();

    cy.contains('Add a card to continue.').should('exist');
    cy.contains('Website was parked').should('exist');
    cy.get('[data-e2e="application-approve"]').should('not.exist');
    cy.get('[data-e2e="application-decline"]').should('not.exist');
  });
});

import { ApplicationList } from '@/features/billing';
import type { BillingArrangementApplication } from '@/features/billing/lib/payment-terms-applications';
import { httpClient } from '@/modules/axios/axios.client';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { client } from '@openapi/shared/client.gen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mount } from 'cypress/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

// ListTable reads the route matches, so this needs a data router.
const mountList = () => {
  client.setConfig({ axios: httpClient });
  const router = createMemoryRouter(
    [{ path: '/customers/billing-accounts/applications', element: <ApplicationList /> }],
    { initialEntries: ['/customers/billing-accounts/applications'] }
  );
  return mount(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: 0 } },
          })
        }>
        <div className="flex h-[600px] flex-col">
          <RouterProvider router={router} />
        </div>
      </QueryClientProvider>
    </I18nProvider>
  );
};

const proxyList = (items: unknown[]) => ({
  statusCode: 200,
  body: { code: 'OK', path: '/x', data: { items } },
});

const application = (
  name: string,
  legalName: string,
  submitted: string,
  phase?: 'Approved' | 'Declined'
): BillingArrangementApplication => ({
  metadata: { name, namespace: 'organization-acme', creationTimestamp: submitted },
  spec: {
    billingAccountRef: { name: 'acme-billing' },
    paymentOption: 'Invoice',
    organization: { legalName, type: 'Company', website: 'https://acme.com' },
    situation: 'Purchase orders only.',
    invoice: { estimatedMonthlySpend: 'Over10000', accountsPayableEmail: 'ap@acme.com' },
    authorized: true,
    applicant: { username: 'jane@acme.com', uid: 'user-1' },
  },
  status: phase ? { phase } : { phase: 'Pending' },
});

describe('ApplicationList', () => {
  beforeEach(() => cy.viewport(1400, 700));

  it('lists the oldest pending application first and counts what is waiting', () => {
    cy.intercept(
      'GET',
      '**/billingarrangementapplications*',
      proxyList([
        application('a-approved', 'Approved Co', '2026-10-20T09:00:00Z', 'Approved'),
        application('a-new', 'Newer Pending Inc', '2026-10-25T09:00:00Z'),
        application('a-old', 'Older Pending LLC', '2026-10-01T09:00:00Z'),
      ])
    );
    cy.intercept(
      'GET',
      '**/billingaccounts*',
      proxyList([
        {
          metadata: { name: 'acme-billing', namespace: 'organization-acme' },
          spec: { currencyCode: 'USD' },
        },
      ])
    );
    cy.intercept('POST', '**/graphql*', { statusCode: 500, body: {} });

    mountList();

    cy.contains('a', 'Applications').should('contain.text', '2');
    cy.get('tbody tr').first().should('contain.text', 'Older Pending LLC');
    cy.get('tbody tr').eq(1).should('contain.text', 'Newer Pending Inc');
    cy.get('tbody tr').eq(2).should('contain.text', 'Approved Co');
    cy.contains('$10,000+').should('exist');
    cy.contains('a', 'Older Pending LLC').should(
      'have.attr',
      'href',
      '/customers/billing-accounts/applications/acme/a-old'
    );
    cy.screenshot('application-list');
  });
});

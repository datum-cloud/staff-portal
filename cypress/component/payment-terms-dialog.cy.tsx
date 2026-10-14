import { PaymentTermsFormDialog } from '@/features/billing/components/payment-terms-card';
import { emptyPaymentTermsForm } from '@/features/billing/lib/payment-terms';
import { RHFAdapter } from '@datum-cloud/datum-ui/form/adapters/rhf';

function mountGrantDialog() {
  // The app wraps every form in RHFAdapter (app/root.tsx).
  cy.mount(
    <RHFAdapter>
      <PaymentTermsFormDialog
        open
        onOpenChange={() => {}}
        title="Grant payment terms"
        description="The account will be billed by invoice on these terms. Overlapping terms are rejected, so end the current terms first if there are any."
        submitText="Grant"
        currency="USD"
        defaultValues={emptyPaymentTermsForm}
        showStart
        onSubmit={async () => {}}
      />
    </RHFAdapter>
  );
}

describe('PaymentTermsFormDialog', () => {
  // A laptop-height window: the form is taller than the dialog's 80vh cap, so
  // the body has to scroll while the footer stays in view.
  beforeEach(() => cy.viewport(1280, 720));

  it('keeps the footer visible when the form is taller than the dialog', () => {
    mountGrantDialog();

    cy.contains('button', 'Grant').should('be.visible');
    cy.contains('button', 'Cancel').should('be.visible');
  });

  it('only marks net days, credit limit and reason as required', () => {
    mountGrantDialog();

    const required = ['Net days', 'Credit limit (USD)', 'Reason (internal)'];
    const optional = [
      'Accounts payable email',
      'PO number',
      'Agreement reference',
      'Start date',
      'End date',
    ];
    for (const label of required) {
      cy.contains('label', label).find('[aria-hidden="true"]').should('have.text', '*');
    }
    for (const label of optional) {
      cy.contains('label', label).find('[aria-hidden="true"]').should('not.exist');
    }
  });
});

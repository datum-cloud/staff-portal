import { DangerZoneCard } from '@/components/danger-zone-card';

// Renders the REAL DangerZoneCard + DialogConfirm (no module mocking).
describe('DangerZoneCard', () => {
  // Single alias so cy.get('@onConfirm') matches the stub the component receives.
  const mount = (props: Record<string, unknown> = {}) => {
    const onConfirm = props.onConfirm ?? cy.stub().as('onConfirm');
    cy.mount(
      <DangerZoneCard
        deleteTitle="Delete User"
        deleteDescription="Permanently delete this user and all associated data."
        dialogTitle="Delete User"
        dialogDescription="This action cannot be undone. This will permanently delete the user."
        {...props}
        onConfirm={onConfirm as () => void | Promise<void>}
      />
    );
  };

  describe('Rendering', () => {
    it('renders the danger zone header, delete section and action button', () => {
      mount();
      cy.contains('Danger Zone').should('be.visible');
      cy.contains('Irreversible and destructive actions').should('be.visible');
      cy.contains('Delete User').should('be.visible');
      cy.contains('Permanently delete this user and all associated data.').should('be.visible');
      cy.contains('button', 'Delete').should('be.visible');
    });

    it('applies a custom className to the card', () => {
      mount({ className: 'custom-danger-zone' });
      cy.get('.custom-danger-zone').should('exist');
    });
  });

  describe('Dialog interaction', () => {
    it('opens the confirmation dialog with the dialog title and description', () => {
      mount();
      cy.contains('button', 'Delete').click();
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Delete User').should('be.visible');
        cy.contains('This action cannot be undone. This will permanently delete the user.').should(
          'be.visible'
        );
      });
    });

    it('calls onConfirm and closes the dialog after typing DELETE and confirming', () => {
      mount({ onConfirm: cy.stub().as('onConfirm').resolves() });
      cy.contains('button', 'Delete').click();
      cy.get('[role="dialog"]').within(() => {
        cy.get('#confirmation-input').type('DELETE');
        cy.contains('button', 'Delete').click();
      });
      cy.get('@onConfirm').should('have.been.calledOnce');
      cy.get('[role="dialog"]').should('not.exist');
    });
  });
});

import ButtonDeleteAction from '@/components/button/button-delete-action';

// Renders the REAL ButtonDeleteAction + DialogConfirm + Button (no module mocking).
// The real DialogConfirm uses requireConfirmation, so the confirm button stays
// disabled until the word "DELETE" is typed.
describe('ButtonDeleteAction', () => {
  // Use the caller-provided onConfirm stub if present; otherwise create one.
  // Aliasing happens exactly once so cy.get('@onConfirm') resolves to the same
  // stub the component receives.
  const mount = (props: Record<string, unknown> = {}) => {
    const onConfirm = props.onConfirm ?? cy.stub().as('onConfirm');
    cy.mount(
      <ButtonDeleteAction
        itemType="Project"
        description="This action cannot be undone."
        {...props}
        onConfirm={onConfirm as () => void | Promise<void>}
      />
    );
  };

  describe('Rendering', () => {
    it('renders a single trigger button with the trash icon', () => {
      mount();
      cy.get('button').should('have.length', 1);
      cy.get('button').find('svg').should('exist');
    });

    it('applies custom button props (disabled)', () => {
      mount({ buttonProps: { disabled: true } });
      cy.get('button').should('be.disabled');
    });
  });

  describe('Dialog interaction', () => {
    it('opens the confirmation dialog with the item-typed title', () => {
      mount();
      cy.get('button').click();
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Delete Project').should('be.visible');
        cy.contains('This action cannot be undone.').should('be.visible');
      });
    });

    it('renders the correct title for different item types', () => {
      mount({ itemType: 'Organization' });
      cy.get('button').click();
      cy.get('[role="dialog"]').contains('Delete Organization').should('be.visible');
    });

    it('keeps the confirm button disabled until DELETE is typed', () => {
      mount();
      cy.get('button').click();
      cy.get('[role="dialog"]').within(() => {
        cy.contains('button', 'Delete').should('be.disabled');
        cy.get('#confirmation-input').type('DELETE');
        cy.contains('button', 'Delete').should('not.be.disabled');
      });
    });

    it('closes the dialog when cancel is clicked', () => {
      mount();
      cy.get('button').click();
      cy.get('[role="dialog"]').contains('button', 'Cancel').click();
      cy.get('[role="dialog"]').should('not.exist');
    });
  });

  describe('Confirmation flow', () => {
    it('calls onConfirm and closes the dialog on confirm', () => {
      mount({ onConfirm: cy.stub().as('onConfirm').resolves() });
      cy.get('button').click();
      cy.get('[role="dialog"]').within(() => {
        cy.get('#confirmation-input').type('DELETE');
        cy.contains('button', 'Delete').click();
      });
      cy.get('@onConfirm').should('have.been.calledOnce');
      cy.get('[role="dialog"]').should('not.exist');
    });

    it('keeps the dialog open when onConfirm rejects', () => {
      mount({ onConfirm: cy.stub().as('onConfirm').rejects(new Error('Delete failed')) });
      cy.get('button').click();
      cy.get('[role="dialog"]').within(() => {
        cy.get('#confirmation-input').type('DELETE');
        cy.contains('button', 'Delete').click();
      });
      cy.get('@onConfirm').should('have.been.calledOnce');
      cy.get('[role="dialog"]').should('exist');
    });
  });
});

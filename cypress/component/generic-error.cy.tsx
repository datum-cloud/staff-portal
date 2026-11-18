import GenericError from '@/components/error/generic';

const THEMES = ['light', 'dark'] as const;
const LONG_MESSAGE = `Unexpected token in ${'a-very-long-unbroken-identifier-'.repeat(8)}`;

// Mirrors the root ErrorBoundary's ErrorLayout, which centres the card.
const mountError = () =>
  cy.mount(
    <div className="bg-background flex min-h-screen items-center justify-center">
      <GenericError message={LONG_MESSAGE} requestId="req-123" />
    </div>
  );

THEMES.forEach((theme) => {
  describe(`GenericError (${theme} theme)`, () => {
    beforeEach(() => {
      cy.document().then((doc) => doc.documentElement.classList.toggle('dark', theme === 'dark'));
    });

    it('shows the message and the request ID', () => {
      mountError();
      cy.contains('Something glitched! Probably not your fault.').should('be.visible');
      cy.contains('Request ID:').should('be.visible');
      cy.contains('req-123').should('be.visible');
    });

    it('renders the home action as one link, not a button inside a link', () => {
      mountError();
      cy.contains('a', 'Back to Home').should('have.attr', 'href', '/');
      cy.get('a button').should('not.exist');
    });

    [320, 768, 1280].forEach((width) => {
      it(`fits a ${width}px viewport without horizontal overflow`, () => {
        cy.viewport(width, 720);
        mountError();
        cy.document().then((doc) => {
          expect(doc.documentElement.scrollWidth).to.be.at.most(width);
        });
        cy.contains('Back to Home').should('be.visible');
      });
    });

    it('stays readable-width on a wide screen', () => {
      cy.viewport(1920, 1080);
      mountError();
      cy.get('[data-slot="card"]').invoke('outerWidth').should('be.at.most', 576);
    });
  });
});

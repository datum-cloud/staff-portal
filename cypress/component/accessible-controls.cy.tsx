import ButtonCopy from '@/components/button/button-copy';
import ButtonDeleteAction from '@/components/button/button-delete-action';
import { DateRangePicker } from '@/components/date';

const THEMES = ['light', 'dark'] as const;

// datum-ui's `dark` variant keys off a `.dark` ancestor, so the theme is set on <html>.
const useTheme = (theme: (typeof THEMES)[number]) => {
  beforeEach(() => {
    cy.document().then((doc) => doc.documentElement.classList.toggle('dark', theme === 'dark'));
  });
};

// Renders the REAL components (no module mocking) and checks the name a screen
// reader announces, since these buttons show only an icon.
THEMES.forEach((theme) => {
  describe(`Icon-only controls (${theme} theme)`, () => {
    useTheme(theme);

    it('names the copy button', () => {
      cy.mount(<ButtonCopy value="abc" />);
      cy.get('button[aria-label="Copy"]').should('be.visible');
    });

    it('names the copy button after a custom tooltip', () => {
      cy.mount(<ButtonCopy value="abc" tooltipText="Copy request ID" />);
      cy.get('button[aria-label="Copy request ID"]').should('be.visible');
    });

    it('names the delete button after the item type', () => {
      cy.mount(<ButtonDeleteAction itemType="Project" description="Gone." onConfirm={cy.stub()} />);
      cy.get('button[aria-label="Delete Project"]').should('be.visible');
    });

    describe('DateRangePicker clear button', () => {
      const range = { from: new Date(2026, 0, 1, 9, 0), to: new Date(2026, 0, 2, 17, 0) };

      it('is a named button outside the trigger button', () => {
        cy.mount(<DateRangePicker value={range} onValueChange={cy.stub()} />);
        cy.get('button[aria-label="Clear date range"]').should('be.visible');
        cy.get('button button').should('not.exist');
      });

      it('clears the range without opening the calendar', () => {
        const onValueChange = cy.stub().as('onValueChange');
        cy.mount(<DateRangePicker value={range} onValueChange={onValueChange} />);
        cy.get('button[aria-label="Clear date range"]').click();
        cy.get('@onValueChange').should('have.been.calledOnceWith', undefined);
        cy.get('[role="dialog"]').should('not.exist');
      });

      // A native <button> that holds focus is activated by Enter and Space, so
      // being its own tab stop is what makes it usable from the keyboard.
      it('is its own tab stop', () => {
        cy.mount(<DateRangePicker value={range} onValueChange={cy.stub()} />);
        cy.get('button[aria-label="Clear date range"]')
          .focus()
          .should('have.focus')
          .and('have.prop', 'tagName', 'BUTTON');
      });

      it('is not rendered when there is no range', () => {
        cy.mount(<DateRangePicker onValueChange={cy.stub()} />);
        cy.get('button[aria-label="Clear date range"]').should('not.exist');
      });
    });
  });
});

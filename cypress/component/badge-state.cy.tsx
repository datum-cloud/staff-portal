import BadgeState from '@/components/badge/badge-state';

// Renders the REAL Badge / Tooltip / icon components (no module mocking) and
// asserts on the actual rendered text and Tailwind color classes.
describe('BadgeState', () => {
  describe('Rendering', () => {
    it('renders nothing when state and message are empty', () => {
      cy.mount(<BadgeState state="" />);
      cy.get('[class*="text-xs"]').should('not.exist');
    });

    it('renders with custom message when provided', () => {
      cy.mount(<BadgeState state="active" message="Custom Label" />);
      cy.contains('Custom Label').should('be.visible');
    });

    it('renders start-cased state when message not provided', () => {
      cy.mount(<BadgeState state="inactive" />);
      cy.contains('Inactive').should('be.visible');
    });

    it('splits CamelCase API states into words', () => {
      cy.mount(<BadgeState state="PendingApproval" />);
      cy.contains('Pending Approval').should('be.visible');
    });

    it('applies base classes on the badge', () => {
      cy.mount(<BadgeState state="active" />);
      cy.get('.inline-flex.items-center.gap-1.text-xs.font-medium').should('exist');
    });

    it('appends custom className', () => {
      cy.mount(<BadgeState state="active" className="extra-class" />);
      cy.get('.extra-class').should('exist');
    });
  });

  describe('Colors and theming', () => {
    it('uses green color classes for known positive states', () => {
      cy.mount(<BadgeState state="active" />);
      cy.get('[class*="bg-green-100"]').should('exist');
    });

    it('uses red color classes for error-like states', () => {
      cy.mount(<BadgeState state="error" />);
      cy.get('[class*="bg-red-100"]').should('exist');
    });

    it('uses gray color classes for pending', () => {
      cy.mount(<BadgeState state="pending" />);
      cy.get('[class*="bg-gray-100"]').should('exist');
    });

    it('falls back to gray color classes for unknown states', () => {
      cy.mount(<BadgeState state="mystery" />);
      cy.get('[class*="bg-gray-100"]').should('exist');
    });

    it('uses outline gray styles when noColor is true', () => {
      cy.mount(<BadgeState state="error" noColor />);
      cy.get('[class*="border-gray-200"]').should('exist');
      cy.get('[class*="bg-red-100"]').should('not.exist');
    });
  });

  describe('Loading', () => {
    it('shows a spinning loader icon when loading is true', () => {
      cy.mount(<BadgeState state="active" loading />);
      cy.get('.animate-spin').should('exist');
    });
  });
});

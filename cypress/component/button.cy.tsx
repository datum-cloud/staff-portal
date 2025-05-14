import { mount } from 'cypress/react';
import React from 'react';

describe('Button Component', () => {
  it('renders with correct text', () => {
    mount(<button>Click me</button>);
    cy.get('button').should('have.text', 'Click me');
  });

  it('handles click events', () => {
    const onClickSpy = cy.spy().as('onClickSpy');
    mount(<button onClick={onClickSpy}>Click me</button>);

    cy.get('button').click();
    cy.get('@onClickSpy').should('have.been.calledOnce');
  });

  it('can be disabled', () => {
    mount(<button disabled>Click me</button>);
    cy.get('button').should('be.disabled');
  });

  it('applies custom className', () => {
    mount(<button className="custom-class">Click me</button>);
    cy.get('button').should('have.class', 'custom-class');
  });
});

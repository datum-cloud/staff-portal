import { listAllOrganizations } from '@/resources/request/client/apis/organization.api';
import { listAllProjects } from '@/resources/request/client/apis/project.api';
import { listAllUsers } from '@/resources/request/client/apis/user.api';
import { CursorExpiredError } from '@/utils/errors';

const PROJECTS_PATH = '/api/graphql';

function projectPage(names: string[], continueToken: string | null) {
  return {
    data: {
      projects: {
        items: names.map((name) => ({ name, displayName: name, organizationName: 'org-1' })),
        continueToken,
      },
    },
  };
}

function organizationPage(names: string[], continueToken: string | null) {
  return {
    data: {
      organizations: {
        items: names.map((name) => ({ name, displayName: name, type: 'Standard' })),
        continueToken,
      },
    },
  };
}

function userPage(names: string[], continueToken: string | null) {
  return {
    data: {
      users: {
        items: names.map((name) => ({ name, email: `${name}@example.com` })),
        continueToken,
      },
    },
  };
}

function expiredCursor() {
  return {
    errors: [{ message: 'continue token is expired', extensions: { code: 'CURSOR_EXPIRED' } }],
  };
}

/** The client sends positional variables ($v1, $v2, …); find the one bound to `cursor`. */
function cursorOf(body: { query?: string; variables?: Record<string, unknown> }) {
  const bound = body.query?.match(/cursor:\s*\$(\w+)/)?.[1];
  const cursor = bound ? body.variables?.[bound] : null;
  return typeof cursor === 'string' ? cursor : null;
}

describe('listAllProjects', () => {
  it('restarts from the first page when page two hits an expired cursor', () => {
    const cursors: Array<string | null> = [];

    cy.intercept('POST', PROJECTS_PATH, (req) => {
      const cursor = cursorOf(req.body);
      cursors.push(cursor);

      if (cursor === 'page-2') req.reply(expiredCursor());
      else if (cursors.length === 1) req.reply(projectPage(['a'], 'page-2'));
      else req.reply(projectPage(['a', 'b'], null));
    });

    cy.wrap(null)
      .then(() => listAllProjects())
      .then((result) => {
        expect(result.items.map((p) => p.name)).to.deep.equal(['a', 'b']);
        expect(result.hasMore).to.equal(false);
        expect(cursors).to.deep.equal([null, 'page-2', null]);
      });
  });

  it('throws when a second walk expires the cursor again', () => {
    const cursors: Array<string | null> = [];

    cy.intercept('POST', PROJECTS_PATH, (req) => {
      const cursor = cursorOf(req.body);
      cursors.push(cursor);

      if (cursor === 'page-2') req.reply(expiredCursor());
      else req.reply(projectPage(['a'], 'page-2'));
    });

    cy.wrap(null)
      .then(() =>
        listAllProjects().then(
          () => {
            throw new Error('expected listAllProjects to throw');
          },
          (error: unknown) => error
        )
      )
      .then((error) => {
        expect(error).to.be.instanceOf(CursorExpiredError);
        expect(cursors).to.deep.equal([null, 'page-2', null, 'page-2']);
      });
  });

  it('propagates an expiry on the cursor-less first request without retrying', () => {
    const cursors: Array<string | null> = [];

    cy.intercept('POST', PROJECTS_PATH, (req) => {
      cursors.push(cursorOf(req.body));
      req.reply(expiredCursor());
    });

    cy.wrap(null)
      .then(() =>
        listAllProjects().then(
          () => {
            throw new Error('expected listAllProjects to throw');
          },
          (error: unknown) => error
        )
      )
      .then((error) => {
        expect(error).to.be.instanceOf(CursorExpiredError);
        expect(cursors).to.deep.equal([null]);
      });
  });

  it('shares one page budget across the restart and reports hasMore', () => {
    const cursors: Array<string | null> = [];
    let expired = false;

    cy.intercept('POST', PROJECTS_PATH, (req) => {
      const cursor = cursorOf(req.body);
      cursors.push(cursor);

      if (cursor === 'page-2' && !expired) {
        expired = true;
        req.reply(expiredCursor());
        return;
      }

      req.reply(projectPage([`p${cursors.length}`], `page-${cursors.length + 1}`));
    });

    cy.wrap(null)
      .then(() => listAllProjects())
      .then((result) => {
        expect(cursors.length).to.equal(100);
        expect(result.hasMore).to.equal(true);
      });
  });
});

describe('listAllOrganizations', () => {
  it('does not duplicate rows when the search walk restarts', () => {
    const cursors: Array<string | null> = [];
    let expired = false;

    cy.intercept('POST', PROJECTS_PATH, (req) => {
      const cursor = cursorOf(req.body);
      cursors.push(cursor);

      if (cursor === 'page-2' && !expired) {
        expired = true;
        req.reply(expiredCursor());
        return;
      }

      if (cursors.length === 1) req.reply(organizationPage(['alpha', 'beta'], 'page-2'));
      else req.reply(organizationPage(['alpha', 'beta', 'gamma'], null));
    });

    cy.wrap(null)
      .then(() => listAllOrganizations('a'))
      .then((result) => {
        const names = result.items.map((org) => org.name);
        expect(names).to.deep.equal(['alpha', 'beta', 'gamma']);
        expect(new Set(names).size).to.equal(names.length);
        expect(result.hasMore).to.equal(false);
        expect(cursors).to.deep.equal([null, 'page-2', null]);
      });
  });
});

describe('listAllUsers', () => {
  it('restarts from the first page when page two hits an expired cursor', () => {
    const cursors: Array<string | null> = [];
    let expired = false;

    cy.intercept('POST', PROJECTS_PATH, (req) => {
      const cursor = cursorOf(req.body);
      cursors.push(cursor);

      if (cursor === 'page-2' && !expired) {
        expired = true;
        req.reply(expiredCursor());
        return;
      }

      if (cursors.length === 1) req.reply(userPage(['u1'], 'page-2'));
      else req.reply(userPage(['u1', 'u2'], null));
    });

    cy.wrap(null)
      .then(() => listAllUsers())
      .then((result) => {
        expect(result.items.map((user) => user.metadata?.name)).to.deep.equal(['u1', 'u2']);
        expect(result.hasMore).to.equal(false);
        expect(cursors).to.deep.equal([null, 'page-2', null]);
      });
  });
});

import { listAllProjects } from '@/resources/request/client/apis/project.api';
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
});

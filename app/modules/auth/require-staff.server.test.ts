import { requireStaffUser } from './require-staff.server';
import { authenticator } from '@/modules/auth';
import { redirectToReauth } from '@/modules/auth/reauth.server';
import { userDetailQuery } from '@/resources/request/server';
import { userGroupMembershipsQuery } from '@/resources/request/server/group.request';
import { env } from '@/utils/config/env.server';
import { AuthorizationError } from '@/utils/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STAFF_GROUP = 'staff-users';
const TOKEN = 'access-token';
const USER_ID = 'user-123';

vi.mock('@/modules/auth', () => ({
  authenticator: {
    isAuthenticated: vi.fn(),
    isValidSession: vi.fn(),
    getSession: vi.fn(),
  },
}));

vi.mock('@/modules/auth/reauth.server', () => ({
  redirectToReauth: vi.fn(),
}));

vi.mock('@/resources/request/server', () => ({
  userDetailQuery: vi.fn(),
}));

vi.mock('@/resources/request/server/group.request', () => ({
  userGroupMembershipsQuery: vi.fn(),
}));

// A plain copy of the real env, so each test can set the two fields the gate reads.
vi.mock('@/utils/config/env.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/config/env.server')>();
  return { ...actual, env: { ...actual.env } };
});

const isAuthenticated = vi.mocked(authenticator.isAuthenticated);
const isValidSession = vi.mocked(authenticator.isValidSession);
const getSession = vi.mocked(authenticator.getSession);
const reauth = vi.mocked(redirectToReauth);
const memberships = vi.mocked(userGroupMembershipsQuery);
const userDetail = vi.mocked(userDetailQuery);

const membership = (groupName?: string) =>
  ({ spec: groupName ? { groupRef: { name: groupName } } : undefined }) as never;

const user = { metadata: { name: USER_ID } } as never;

/** Calls the gate for `path` and returns whatever it throws. */
async function thrownBy(path = '/customers/users?tab=all'): Promise<unknown> {
  const url = new URL(path, 'http://localhost:3000');
  try {
    await requireStaffUser(new Request(url), url);
  } catch (error) {
    return error;
  }
  throw new Error('requireStaffUser did not throw');
}

function expectRedirect(thrown: unknown, location: string) {
  expect(thrown).toBeInstanceOf(Response);
  const response = thrown as Response;
  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe(location);
}

describe('requireStaffUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    env.isCypress = false;
    env.staffGroupName = STAFF_GROUP;

    // A signed-in staff user; each test overrides the part it is about.
    isAuthenticated.mockResolvedValue(true);
    isValidSession.mockResolvedValue(true);
    getSession.mockResolvedValue({ accessToken: TOKEN, sub: USER_ID } as never);
    memberships.mockResolvedValue([membership(STAFF_GROUP)]);
    userDetail.mockResolvedValue(user);
  });

  describe('unauthenticated', () => {
    beforeEach(() => isAuthenticated.mockResolvedValue(false));

    it('redirects to /login with the requested path and query as redirectTo', async () => {
      expectRedirect(
        await thrownBy('/customers/users?tab=all'),
        `/login?redirectTo=${encodeURIComponent('/customers/users?tab=all')}`
      );
    });

    it('redirects to a bare /login when the request was for the dashboard', async () => {
      expectRedirect(await thrownBy('/'), '/login');
    });

    it('does not check the session or look anything up', async () => {
      await thrownBy();

      expect(isValidSession).not.toHaveBeenCalled();
      expect(getSession).not.toHaveBeenCalled();
      expect(memberships).not.toHaveBeenCalled();
      expect(userDetail).not.toHaveBeenCalled();
    });
  });

  describe('expired session', () => {
    it('throws the reauth redirect for the requested path', async () => {
      const reauthResponse = new Response(null, {
        status: 302,
        headers: { Location: '/login?redirectTo=%2Fcustomers%2Fusers' },
      });
      isValidSession.mockResolvedValue(false);
      reauth.mockResolvedValue(reauthResponse);

      const thrown = await thrownBy('/customers/users');

      expect(thrown).toBe(reauthResponse);
      expect(reauth).toHaveBeenCalledWith(expect.any(Request), '/customers/users');
      expect(memberships).not.toHaveBeenCalled();
    });
  });

  describe('staff membership', () => {
    it('returns the user when a membership points at the staff group', async () => {
      memberships.mockResolvedValue([membership('billing-admins'), membership(STAFF_GROUP)]);

      const url = new URL('http://localhost:3000/customers/users');
      const result = await requireStaffUser(new Request(url), url);

      expect(result).toEqual({ user });
      expect(memberships).toHaveBeenCalledWith(TOKEN, USER_ID);
      expect(userDetail).toHaveBeenCalledWith(TOKEN, USER_ID);
    });

    it.each([
      ['has no memberships', []],
      ['is only in other groups', [membership('billing-admins')]],
      ['has a membership without a group reference', [membership()]],
      ['is in a group whose name differs only by case', [membership('Staff-Users')]],
    ])('redirects to /error/unauthorized when the user %s', async (_case, list) => {
      memberships.mockResolvedValue(list);

      expectRedirect(await thrownBy(), '/error/unauthorized');
      expect(userDetail).not.toHaveBeenCalled();
    });

    it('denies everyone when no staff group name is configured', async () => {
      env.staffGroupName = '';
      memberships.mockResolvedValue([membership('billing-admins')]);

      expectRedirect(await thrownBy(), '/error/unauthorized');
    });

    it('looks up memberships with empty credentials when the session is missing', async () => {
      getSession.mockResolvedValue(null as never);
      memberships.mockResolvedValue([]);

      expectRedirect(await thrownBy(), '/error/unauthorized');
      expect(memberships).toHaveBeenCalledWith('', '');
    });
  });

  describe('membership lookup failures', () => {
    it.each([401, 403])('treats a thrown %i Response as not staff', async (status) => {
      memberships.mockRejectedValue(new Response(null, { status }));

      expectRedirect(await thrownBy(), '/error/unauthorized');
      expect(userDetail).not.toHaveBeenCalled();
    });

    it('rethrows a 500 Response instead of redirecting', async () => {
      const failure = new Response(null, { status: 500 });
      memberships.mockRejectedValue(failure);

      expect(await thrownBy()).toBe(failure);
    });

    it('rethrows a network error instead of redirecting', async () => {
      const failure = new Error('socket hang up');
      memberships.mockRejectedValue(failure);

      expect(await thrownBy()).toBe(failure);
    });

    // The 403 branch only matches a Response. The server request layer has to
    // keep throwing `toResponse()`; a typed error would surface as a failure.
    it('rethrows a 403 that is an AppError rather than a Response', async () => {
      const failure = new AuthorizationError('forbidden');
      memberships.mockRejectedValue(failure);

      expect(await thrownBy()).toBe(failure);
    });
  });

  it('surfaces a failed user lookup for a staff member', async () => {
    const failure = new Response(null, { status: 404 });
    userDetail.mockRejectedValue(failure);

    expect(await thrownBy()).toBe(failure);
  });

  describe('under Cypress', () => {
    beforeEach(() => {
      env.isCypress = true;
    });

    it('skips the staff gate and the user lookup for a valid session', async () => {
      const url = new URL('http://localhost:3000/');
      const result = await requireStaffUser(new Request(url), url);

      expect(result).toEqual({ user: null });
      expect(memberships).not.toHaveBeenCalled();
      expect(userDetail).not.toHaveBeenCalled();
    });

    it('still redirects an unauthenticated request to /login', async () => {
      isAuthenticated.mockResolvedValue(false);

      expectRedirect(await thrownBy('/'), '/login');
    });

    it('still restarts login for an expired session', async () => {
      const reauthResponse = new Response(null, { status: 302, headers: { Location: '/login' } });
      isValidSession.mockResolvedValue(false);
      reauth.mockResolvedValue(reauthResponse);

      expect(await thrownBy('/')).toBe(reauthResponse);
    });
  });
});

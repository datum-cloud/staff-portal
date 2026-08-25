import { buildActivityFilter, escapeCelString, shapeAuditEvent } from './activity-query';
import { describe, expect, it } from 'bun:test';

describe('escapeCelString', () => {
  it('escapes single quotes', () => {
    expect(escapeCelString("o'brien@example.com")).toBe("o\\'brien@example.com");
  });

  it('escapes backslashes before quotes', () => {
    expect(escapeCelString("a\\b'c")).toBe("a\\\\b\\'c");
  });
});

describe('buildActivityFilter', () => {
  it('defaults to human write operations', () => {
    const filter = buildActivityFilter({});
    expect(filter).toContain("objectRef.apiGroup != 'activity.miloapis.com'");
    expect(filter).toContain("objectRef.apiGroup != 'authorization.k8s.io'");
    expect(filter).toContain("objectRef.apiGroup != 'authentication.k8s.io'");
    expect(filter).toContain("verb in ['create', 'update', 'patch', 'delete', 'deletecollection']");
    expect(filter).toContain("user.username.startsWith('system:') == false");
  });

  it('drops the write-verb clause when includeReads is true', () => {
    const filter = buildActivityFilter({ includeReads: true });
    expect(filter).not.toContain('verb in [');
    expect(filter).toContain("user.username.startsWith('system:') == false");
    expect(filter).toContain("objectRef.apiGroup != 'authorization.k8s.io'");
    expect(filter).toContain("objectRef.apiGroup != 'authentication.k8s.io'");
  });

  it('drops the system-actor clause when includeSystem is true', () => {
    const filter = buildActivityFilter({ includeSystem: true });
    expect(filter).not.toContain("startsWith('system:')");
    expect(filter).toContain('verb in [');
  });

  it('uses a specific verb instead of the writes-only clause', () => {
    const filter = buildActivityFilter({ verb: 'create' });
    expect(filter).not.toContain('verb in [');
    expect(filter).toContain("verb == 'create'");
    expect(filter).toContain("user.username.startsWith('system:') == false");
  });

  it('escapes quotes in CEL string values', () => {
    const filter = buildActivityFilter({ user: "o'brien@example.com" });
    expect(filter).toContain("user.username == 'o\\'brien@example.com'");
  });
});

describe('shapeAuditEvent', () => {
  it('keeps status and error, strips request/response objects', () => {
    const shaped = shapeAuditEvent({
      requestReceivedTimestamp: '2026-08-13T13:52:00Z',
      verb: 'create',
      user: { username: 'colin@example.com' },
      objectRef: { resource: 'notes', name: 'note-1', namespace: 'org-695ss' },
      responseStatus: {
        code: 500,
        message: 'webhook emote.notes.miloapis.com could not be found',
      },
      requestObject: { spec: { huge: true } },
      responseObject: { spec: { huge: true } },
    });

    expect(shaped).toEqual({
      time: '2026-08-13T13:52:00Z',
      actor: 'colin@example.com',
      verb: 'create',
      resource: 'Note',
      name: 'note-1',
      namespace: 'org-695ss',
      status: 500,
      error: 'webhook emote.notes.miloapis.com could not be found',
    });
    expect(shaped).not.toHaveProperty('requestObject');
    expect(shaped).not.toHaveProperty('responseObject');
  });

  it('truncates long error messages', () => {
    const shaped = shapeAuditEvent({
      verb: 'create',
      user: { username: 'colin@example.com' },
      objectRef: { resource: 'notes', name: 'note-1' },
      responseStatus: { code: 500, message: 'x'.repeat(250) },
    });

    expect(shaped.error).toBe(`${'x'.repeat(197)}...`);
    expect(shaped.error?.length).toBe(200);
  });

  it('extracts create email, display name, and staff URL', () => {
    const shaped = shapeAuditEvent({
      requestReceivedTimestamp: '2026-08-13T13:47:00Z',
      verb: 'create',
      user: { username: 'zitadel-actions-server' },
      objectRef: { resource: 'users', name: 'usr-colin' },
      responseStatus: { code: 201 },
      responseObject: {
        metadata: {
          name: 'usr-colin',
          annotations: { 'kubernetes.io/display-name': 'Colin J Riddell' },
        },
        spec: { email: 'colin@caol.io', givenName: 'Colin', familyName: 'Riddell' },
      },
    });

    expect(shaped.email).toBe('colin@caol.io');
    expect(shaped.displayName).toBe('Colin J Riddell');
    expect(shaped.url).toBe('/customers/users/usr-colin');
    expect(shaped.resource).toBe('User');
    expect(shaped.status).toBe(201);
    expect(shaped.error).toBeUndefined();
  });

  it('humanizes known resource types and parses Raw response objects', () => {
    const shaped = shapeAuditEvent({
      requestReceivedTimestamp: '2026-08-13T14:10:00Z',
      verb: 'create',
      user: { username: 'colin@example.com' },
      objectRef: { resource: 'dnszones', name: 'caol-io-seznb8', namespace: 'proj-1' },
      responseStatus: { code: 201 },
      responseObject: {
        Raw: JSON.stringify({ spec: { domainName: 'caol.io' } }),
      },
    });

    expect(shaped.resource).toBe('DNS zone');
    expect(shaped.hostname).toBe('caol.io');
    expect(shaped.url).toBeUndefined();
  });

  it('humanizes billing resource types', () => {
    expect(
      shapeAuditEvent({
        verb: 'create',
        objectRef: { resource: 'billingaccounts', name: 'ba-1' },
      }).resource
    ).toBe('Billing account');
    expect(
      shapeAuditEvent({
        verb: 'create',
        objectRef: { resource: 'paymentmethods', name: 'pm-1' },
      }).resource
    ).toBe('Payment method');
    expect(
      shapeAuditEvent({
        verb: 'create',
        objectRef: { resource: 'billingaccountbindings', name: 'bab-1' },
      }).resource
    ).toBe('Billing binding');
  });
});

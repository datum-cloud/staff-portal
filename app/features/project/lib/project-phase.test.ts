import {
  getProjectPhase,
  getResourceCleanupMessage,
  isProjectDeleting,
  withProjectPhase,
} from './project-phase';
import { describe, expect, it } from 'vitest';

describe('isProjectDeleting', () => {
  it('is true when metadata.deletionTimestamp is set', () => {
    expect(isProjectDeleting({ metadata: { deletionTimestamp: '2026-08-20T10:00:00Z' } })).toBe(
      true
    );
  });

  it('is true when a GraphQL list row has deletionTimestamp', () => {
    expect(isProjectDeleting({ deletionTimestamp: '2026-08-20T10:00:00Z' })).toBe(true);
  });

  it('is false when deletionTimestamp is unset', () => {
    expect(
      isProjectDeleting({ metadata: {}, conditions: [{ type: 'Ready', status: 'True' }] })
    ).toBe(false);
    expect(isProjectDeleting(undefined)).toBe(false);
  });
});

describe('getResourceCleanupMessage', () => {
  it('returns the ResourceCleanup condition message from a REST project', () => {
    expect(
      getResourceCleanupMessage({
        status: {
          conditions: [
            { type: 'Ready', status: 'True', message: 'Ready' },
            {
              type: 'ResourceCleanup',
              status: 'True',
              message:
                'Waiting for project resources to be removed: configmaps "default/job" (finalizers: billing.example.com/drain-pending)',
            },
          ],
        },
      })
    ).toBe(
      'Waiting for project resources to be removed: configmaps "default/job" (finalizers: billing.example.com/drain-pending)'
    );
  });

  it('returns the ResourceCleanup condition message from a gateway row', () => {
    expect(
      getResourceCleanupMessage({
        conditions: [
          { type: 'ResourceCleanup', message: 'Waiting for project resources to be removed' },
        ],
      })
    ).toBe('Waiting for project resources to be removed');
  });

  it('returns null when the condition is missing or empty', () => {
    expect(getResourceCleanupMessage({ status: { conditions: [] } })).toBeNull();
    expect(
      getResourceCleanupMessage({ conditions: [{ type: 'ResourceCleanup', message: '  ' }] })
    ).toBeNull();
  });
});

describe('getProjectPhase', () => {
  it('returns Deleting even when Ready is True', () => {
    expect(
      getProjectPhase({
        metadata: { deletionTimestamp: '2026-08-20T10:00:00Z' },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      })
    ).toBe('Deleting');
    expect(
      getProjectPhase({
        deletionTimestamp: '2026-08-20T10:00:00Z',
        conditions: [{ type: 'Ready', status: 'True' }],
      })
    ).toBe('Deleting');
  });

  it('returns Ready when Ready is True and the project is not deleting', () => {
    expect(getProjectPhase({ status: { conditions: [{ type: 'Ready', status: 'True' }] } })).toBe(
      'Ready'
    );
    expect(getProjectPhase({ conditions: [{ type: 'Ready', status: 'True' }] })).toBe('Ready');
  });

  it('returns Pending when Ready is not True', () => {
    expect(getProjectPhase({ status: { conditions: [{ type: 'Ready', status: 'False' }] } })).toBe(
      'Pending'
    );
    expect(getProjectPhase({ conditions: [{ type: 'Ready', status: 'False' }] })).toBe('Pending');
    expect(getProjectPhase({})).toBe('Pending');
  });
});

describe('withProjectPhase', () => {
  it('adds a derived phase field', () => {
    expect(
      withProjectPhase({ name: 'p', conditions: [{ type: 'Ready', status: 'True' }] }).phase
    ).toBe('Ready');
  });

  it('adds the cleanup message from conditions', () => {
    const row = withProjectPhase({
      name: 'p',
      deletionTimestamp: '2026-08-20T10:00:00Z',
      conditions: [{ type: 'ResourceCleanup', message: 'Waiting for 2 DNS zones' }],
    });
    expect(row.resourceCleanupMessage).toBe('Waiting for 2 DNS zones');
    expect(row.phase).toBe('Deleting');
  });
});

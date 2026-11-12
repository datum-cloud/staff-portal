import {
  instanceDetailPath,
  toInstanceStatus,
  toProjectComputeStatus,
  toWorkloadStatus,
  workloadDetailPath,
} from './compute-status';
import type {
  ComDatumapisComputeV1AlphaInstance,
  ComDatumapisComputeV1AlphaWorkload,
} from '@openapi/compute.datumapis.com/v1alpha';
import { describe, expect, it } from 'vitest';

const PROJECT = 'datum-cloud';
const SLUG = 'compute-datumapis-com';

// Shapes copied from staging project `datum-cloud` (2026-11-09), trimmed to the
// fields the mapper reads.
const healthyInstance = {
  metadata: {
    name: 'alb-validate-dfw-us-central-1-0',
    namespace: 'default',
    creationTimestamp: '2026-10-05T17:01:24Z',
    labels: {
      'compute.datumapis.com/location': 'us-central-1',
      'compute.datumapis.com/workload-name': 'alb-validate',
    },
  },
  spec: { location: { name: 'us-central-1' } },
  status: {
    conditions: [
      {
        type: 'Programmed',
        status: 'True',
        reason: 'Programmed',
        message: 'Instance is available',
        lastTransitionTime: '2026-11-03T18:57:14Z',
      },
      {
        type: 'Ready',
        status: 'True',
        reason: 'Available',
        message: 'Instance is ready',
        lastTransitionTime: '1970-01-01T00:00:00Z',
      },
    ],
  },
} as unknown as ComDatumapisComputeV1AlphaInstance;

const crashingInstance = {
  metadata: {
    name: 'crashing-default-us-central-1-0',
    namespace: 'default',
    creationTimestamp: '2026-10-01T09:00:00Z',
    labels: { 'compute.datumapis.com/workload-name': 'crashing' },
  },
  spec: { location: { name: 'us-central-1' } },
  status: {
    conditions: [
      {
        type: 'Ready',
        status: 'False',
        reason: 'Stopping',
        message: 'Instance has stopped',
        lastTransitionTime: '2026-11-07T15:11:04Z',
      },
      {
        type: 'RuntimeReady',
        status: 'False',
        reason: 'RuntimeExited',
        message: 'The instance runtime exited (Succeeded)',
        lastTransitionTime: '2026-11-07T15:11:04Z',
      },
    ],
  },
} as unknown as ComDatumapisComputeV1AlphaInstance;

const crashingWorkload = {
  metadata: { name: 'crashing', namespace: 'default', creationTimestamp: '2026-10-01T08:59:00Z' },
  status: {
    readyReplicas: 0,
    desiredReplicas: 1,
    replicas: 1,
    currentReplicas: 0,
    conditions: [
      {
        type: 'Available',
        status: 'False',
        reason: 'InstancesProvisioning',
        message: 'Waiting for instances',
        lastTransitionTime: '2026-11-07T15:11:04Z',
      },
    ],
  },
} as unknown as ComDatumapisComputeV1AlphaWorkload;

describe('compute status links', () => {
  it('points at the plugin workload and instance pages, encoding names', () => {
    expect(workloadDetailPath(PROJECT, SLUG, 'api gateway')).toBe(
      '/customers/projects/datum-cloud/plugins/compute-datumapis-com/api%20gateway'
    );
    expect(instanceDetailPath(PROJECT, SLUG, 'crashing', 'crashing-default-us-central-1-0')).toBe(
      '/customers/projects/datum-cloud/plugins/compute-datumapis-com/crashing/instances/crashing-default-us-central-1-0'
    );
  });
});

describe('toWorkloadStatus', () => {
  it('reads ready and desired counts, conditions and the detail link', () => {
    expect(toWorkloadStatus(crashingWorkload, PROJECT, SLUG)).toEqual({
      name: 'crashing',
      namespace: 'default',
      ready: 0,
      desired: 1,
      conditions: [
        {
          type: 'Available',
          status: 'False',
          reason: 'InstancesProvisioning',
          message: 'Waiting for instances',
          lastTransitionTime: '2026-11-07T15:11:04Z',
        },
      ],
      createdAt: '2026-10-01T08:59:00Z',
      href: '/customers/projects/datum-cloud/plugins/compute-datumapis-com/crashing',
    });
  });

  it('treats a missing status as nothing ready and nothing wanted', () => {
    const workload = { metadata: { name: 'new' } } as unknown as ComDatumapisComputeV1AlphaWorkload;
    expect(toWorkloadStatus(workload, PROJECT, SLUG)).toMatchObject({
      ready: 0,
      desired: 0,
      conditions: [],
    });
  });
});

describe('toInstanceStatus', () => {
  it('maps a healthy instance as Ready with its location and links', () => {
    expect(toInstanceStatus(healthyInstance, PROJECT, SLUG)).toMatchObject({
      name: 'alb-validate-dfw-us-central-1-0',
      workloadName: 'alb-validate',
      location: 'us-central-1',
      readiness: 'Ready',
      reason: 'Available',
      createdAt: '2026-10-05T17:01:24Z',
      workloadHref: '/customers/projects/datum-cloud/plugins/compute-datumapis-com/alb-validate',
      href: '/customers/projects/datum-cloud/plugins/compute-datumapis-com/alb-validate/instances/alb-validate-dfw-us-central-1-0',
    });
  });

  it('takes readiness, reason and message from the Ready condition', () => {
    expect(toInstanceStatus(crashingInstance, PROJECT, SLUG)).toMatchObject({
      readiness: 'NotReady',
      reason: 'Stopping',
      message: 'Instance has stopped',
      since: '2026-11-07T15:11:04Z',
    });
    // RuntimeReady stays available for #766 to classify the exit.
    expect(
      toInstanceStatus(crashingInstance, PROJECT, SLUG).conditions.map((c) => c.reason)
    ).toContain('RuntimeExited');
  });

  it('is Unknown with no conditions, and has no links without a workload label', () => {
    const bare = {
      metadata: { name: 'orphan', namespace: 'default', labels: {} },
      spec: {},
    } as unknown as ComDatumapisComputeV1AlphaInstance;
    const status = toInstanceStatus(bare, PROJECT, SLUG);
    expect(status.readiness).toBe('Unknown');
    expect(status).not.toHaveProperty('href');
    expect(status).not.toHaveProperty('workloadHref');
    expect(status).not.toHaveProperty('location');
  });

  it('falls back to the location label when spec.location is missing', () => {
    const labelled = {
      metadata: {
        name: 'x',
        labels: { 'compute.datumapis.com/location': 'us-east-1' },
      },
    } as unknown as ComDatumapisComputeV1AlphaInstance;
    expect(toInstanceStatus(labelled, PROJECT, SLUG).location).toBe('us-east-1');
  });
});

describe('toProjectComputeStatus', () => {
  it('maps both lists and reports when either stopped at its page limit', () => {
    const result = toProjectComputeStatus(
      {
        workloads: { items: [crashingWorkload], hasMore: false },
        instances: { items: [healthyInstance, crashingInstance], hasMore: true },
      },
      PROJECT,
      SLUG
    );
    expect(result.workloads.map((w) => w.name)).toEqual(['crashing']);
    expect(result.instances.map((i) => i.readiness)).toEqual(['Ready', 'NotReady']);
    expect(result.hasMore).toBe(true);
  });
});

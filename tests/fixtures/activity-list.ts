// Fixture for activity list API response
export const activityListFixture = {
  empty: {
    requestId: '451bf129-3e9c-4cc3-a67c-eb23bc94022b',
    code: 'API_REQUEST_SUCCESS',
    data: {
      logs: [],
      query: '',
      timeRange: { start: '2025-10-14T04:16:07.000Z', end: '2025-10-21T04:16:08.613Z' },
      nextPageToken: undefined,
      hasNextPage: false,
    },
    path: '/api/activity',
  },

  withUsers: {
    requestId: '451bf129-3e9c-4cc3-a67c-eb23bc94022b',
    code: 'API_REQUEST_SUCCESS',
    data: {
      logs: [
        {
          timestamp: '2025-10-17T01:56:52.733Z',
          message: 'zitadel-actions-server created users/342540775839501844',
          formattedMessage:
            '<span class="activity-log-user">zitadel-actions-server</span> <span class="activity-log-event">created</span> <span class="activity-log-resource">users/342540775839501844</span>',
          statusMessage: '201 Created',
          level: 'debug',
          raw: JSON.stringify({
            responseObject: {
              spec: {
                email: 'evetere@datum.net',
                familyName: 'Vetere',
                givenName: 'Evan',
              },
              metadata: {
                name: '342540775839501844',
                creationTimestamp: '2025-10-17T01:56:52Z',
              },
            },
          }),
          category: 'success' as const,
          icon: '✅',
          auditID: 'fd1592e4-acc6-4037-977f-5220423429d5',
          verb: 'create',
          requestURI: '/apis/iam.miloapis.com/v1alpha1/users',
          sourceIPs: [],
          userAgent: 'auth-provider-zitadel/v0.0.0 (linux/amd64) kubernetes/$Format',
          stage: 'ResponseComplete',
          annotations: {
            'authorization.k8s.io/decision': 'allow',
            'authorization.k8s.io/reason': '',
            'telemetry.miloapis.com/control-plane-type': 'core',
          },
          user: {
            username: 'zitadel-actions-server',
            uid: 'zitadel-actions-server',
            groups: ['system:masters', 'system:authenticated'],
          },
          resource: {
            apiGroup: 'iam.miloapis.com',
            apiVersion: 'v1alpha1',
            resource: 'users',
            name: '342540775839501844',
          },
          responseStatus: {
            code: 201,
          },
          responseObject: {
            spec: {
              email: 'evetere@datum.net',
              familyName: 'Vetere',
              givenName: 'Evan',
            },
            metadata: {
              name: '342540775839501844',
              creationTimestamp: '2025-10-17T01:56:52Z',
            },
          },
        },
        {
          timestamp: '2025-10-16T22:17:06.824Z',
          message: 'zitadel-actions-server created users/342518653603807268',
          formattedMessage:
            '<span class="activity-log-user">zitadel-actions-server</span> <span class="activity-log-event">created</span> <span class="activity-log-resource">users/342518653603807268</span>',
          statusMessage: '201 Created',
          level: 'debug',
          raw: JSON.stringify({
            responseObject: {
              spec: {
                email: 'smith+staff@datum.net',
                familyName: 'Smith',
                givenName: 'Zach',
              },
              metadata: {
                name: '342518653603807268',
                creationTimestamp: '2025-10-16T22:17:06Z',
              },
            },
          }),
          category: 'success' as const,
          icon: '✅',
          auditID: 'be80d2eb-8db8-44d9-b084-a6170f74cd86',
          verb: 'create',
          requestURI: '/apis/iam.miloapis.com/v1alpha1/users',
          sourceIPs: [],
          userAgent: 'auth-provider-zitadel/v0.0.0 (linux/amd64) kubernetes/$Format',
          stage: 'ResponseComplete',
          annotations: {
            'authorization.k8s.io/decision': 'allow',
            'authorization.k8s.io/reason': '',
            'telemetry.miloapis.com/control-plane-type': 'core',
          },
          user: {
            username: 'zitadel-actions-server',
            uid: 'zitadel-actions-server',
            groups: ['system:masters', 'system:authenticated'],
          },
          resource: {
            apiGroup: 'iam.miloapis.com',
            apiVersion: 'v1alpha1',
            resource: 'users',
            name: '342518653603807268',
          },
          responseStatus: {
            code: 201,
          },
          responseObject: {
            spec: {
              email: 'smith+staff@datum.net',
              familyName: 'Smith',
              givenName: 'Zach',
            },
            metadata: {
              name: '342518653603807268',
              creationTimestamp: '2025-10-16T22:17:06Z',
            },
          },
        },
      ],
      query:
        '{telemetry_datumapis_com_audit_log="true"} | json | stage="ResponseComplete" | requestURI !~ ".*dryRun=All.*" | verb=~"(?i)(create)" | objectRef_resource="users" | user_username="zitadel-actions-server" | responseStatus_code < 400',
      timeRange: { start: '2025-10-14T04:16:07.000Z', end: '2025-10-21T04:16:08.613Z' },
      nextPageToken: '2025-10-16T22:17:06.824Z',
      hasNextPage: true,
    },
    path: '/api/activity',
  },

  malformed: {
    requestId: '451bf129-3e9c-4cc3-a67c-eb23bc94022b',
    code: 'API_REQUEST_SUCCESS',
    data: {
      logs: [
        {
          timestamp: '2025-10-17T01:56:52.733Z',
          message: 'zitadel-actions-server created users/342540775839501844',
          formattedMessage:
            '<span class="activity-log-user">zitadel-actions-server</span> <span class="activity-log-event">created</span> <span class="activity-log-resource">users/342540775839501844</span>',
          statusMessage: '201 Created',
          level: 'debug',
          raw: 'invalid-json',
          category: 'success' as const,
          icon: '✅',
          auditID: 'fd1592e4-acc6-4037-977f-5220423429d5',
          verb: 'create',
          requestURI: '/apis/iam.miloapis.com/v1alpha1/users',
          sourceIPs: [],
          userAgent: 'auth-provider-zitadel/v0.0.0 (linux/amd64) kubernetes/$Format',
          stage: 'ResponseComplete',
          annotations: {
            'authorization.k8s.io/decision': 'allow',
            'authorization.k8s.io/reason': '',
            'telemetry.miloapis.com/control-plane-type': 'core',
          },
          user: {
            username: 'zitadel-actions-server',
            uid: 'zitadel-actions-server',
            groups: ['system:masters', 'system:authenticated'],
          },
          resource: {
            apiGroup: 'iam.miloapis.com',
            apiVersion: 'v1alpha1',
            resource: 'users',
            name: '342540775839501844',
          },
          responseStatus: {
            code: 201,
          },
        },
      ],
      query:
        '{telemetry_datumapis_com_audit_log="true"} | json | stage="ResponseComplete" | requestURI !~ ".*dryRun=All.*" | verb=~"(?i)(create)" | objectRef_resource="users" | user_username="zitadel-actions-server" | responseStatus_code < 400',
      timeRange: { start: '2025-10-14T04:16:07.000Z', end: '2025-10-21T04:16:08.613Z' },
      nextPageToken: undefined,
      hasNextPage: false,
    },
    path: '/api/activity',
  },
};

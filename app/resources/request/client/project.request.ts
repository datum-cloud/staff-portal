import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  DNSZoneListResponse,
  DNSZoneListResponseSchema,
  DomainListResponseSchema,
  DomainResponseSchema,
  ExportPolicyListResponseSchema,
  HTTPProxyListResponseSchema,
  ListQueryParams,
  ProjectListResponseSchema,
} from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const projectListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
    },
  })
    .output(ProjectListResponseSchema)
    .execute();
};

export const projectHttpProxyListQuery = (projectName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/networking.datumapis.com/v1alpha/httpproxies`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(HTTPProxyListResponseSchema)
    .execute();
};

export const projectExportPolicyListQuery = (projectName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/telemetry.miloapis.com/v1alpha1/namespaces/default/exportpolicies`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(ExportPolicyListResponseSchema)
    .execute();
};

export const projectDnsListQuery = (projectName: string, params?: ListQueryParams) => {
  // return apiRequestClient({
  //   method: 'GET',
  //   url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnszones`,
  //   params: {
  //     ...(params?.limit && { limit: params.limit }),
  //     ...(params?.cursor && { continue: params.cursor }),
  //   },
  // })
  //   .output(DNSZoneListResponseSchema)
  //   .execute();

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          apiVersion: 'dns.networking.miloapis.com/v1alpha1',
          items: [
            {
              apiVersion: 'dns.networking.miloapis.com/v1alpha1',
              kind: 'DNSZone',
              metadata: {
                annotations: {
                  'kubernetes.io/description': 'Personal Site',
                },
                creationTimestamp: '2025-11-26T03:34:33Z',
                finalizers: ['dns.networking.miloapis.com/finalize-dnszone'],
                generation: 1,
                managedFields: [
                  {
                    apiVersion: 'dns.networking.miloapis.com/v1alpha1',
                    fieldsType: 'FieldsV1',
                    fieldsV1: {
                      'f:metadata': {
                        'f:annotations': {
                          '.': {},
                          'f:kubernetes.io/description': {},
                        },
                      },
                      'f:spec': {
                        '.': {},
                        'f:dnsZoneClassName': {},
                        'f:domainName': {},
                      },
                    },
                    manager: 'axios',
                    operation: 'Update',
                    time: '2025-11-26T03:34:33Z',
                  },
                  {
                    apiVersion: 'dns.networking.miloapis.com/v1alpha1',
                    fieldsType: 'FieldsV1',
                    fieldsV1: {
                      'f:metadata': {
                        'f:finalizers': {
                          '.': {},
                          'v:"dns.networking.miloapis.com/finalize-dnszone"': {},
                        },
                      },
                    },
                    manager: 'manager',
                    operation: 'Update',
                    time: '2025-11-26T03:34:33Z',
                  },
                  {
                    apiVersion: 'dns.networking.miloapis.com/v1alpha1',
                    fieldsType: 'FieldsV1',
                    fieldsV1: {
                      'f:status': {
                        '.': {},
                        'f:conditions': {
                          '.': {},
                          'k:{"type":"Accepted"}': {
                            '.': {},
                            'f:lastTransitionTime': {},
                            'f:message': {},
                            'f:observedGeneration': {},
                            'f:reason': {},
                            'f:status': {},
                            'f:type': {},
                          },
                          'k:{"type":"Programmed"}': {
                            '.': {},
                            'f:lastTransitionTime': {},
                            'f:message': {},
                            'f:observedGeneration': {},
                            'f:reason': {},
                            'f:status': {},
                            'f:type': {},
                          },
                        },
                        'f:domainRef': {
                          '.': {},
                          'f:name': {},
                          'f:status': {
                            '.': {},
                            'f:nameservers': {},
                          },
                        },
                        'f:nameservers': {},
                        'f:recordCount': {},
                      },
                    },
                    manager: 'manager',
                    operation: 'Update',
                    subresource: 'status',
                    time: '2025-11-26T04:21:56Z',
                  },
                ],
                name: 'hiyahya-dev-envqwx',
                namespace: 'default',
                resourceVersion: '302153111',
                uid: 'cf7e9bac-39f4-4c2b-9211-b5364c94261b',
              },
              spec: {
                dnsZoneClassName: 'datum-external-global-dns',
                domainName: 'hiyahya.dev',
              },
              status: {
                conditions: [
                  {
                    lastTransitionTime: '2025-11-26T03:34:33Z',
                    message: 'Nameservers retrieved from downstream',
                    observedGeneration: 1,
                    reason: 'Accepted',
                    status: 'True',
                    type: 'Accepted',
                  },
                  {
                    lastTransitionTime: '2025-11-26T03:34:34Z',
                    message: 'Default records ensured',
                    observedGeneration: 1,
                    reason: 'Programmed',
                    status: 'True',
                    type: 'Programmed',
                  },
                ],
                domainRef: {
                  name: 'hiyahya-dev-clw2d',
                  status: {
                    nameservers: [
                      {
                        hostname: 'connie.ns.cloudflare.com',
                        ips: [
                          {
                            address: '172.64.32.247',
                            registrantName: 'Cloudflare, Inc.',
                          },
                          {
                            address: '108.162.192.247',
                            registrantName: 'Cloudflare, Inc.',
                          },
                          {
                            address: '173.245.58.247',
                            registrantName: 'Cloudflare, Inc.',
                          },
                          {
                            address: '2606:4700:50::adf5:3af7',
                            registrantName: 'Cloudflare, Inc.',
                          },
                          {
                            address: '2803:f800:50::6ca2:c0f7',
                            registrantName: 'CloudFlare Latin America S.R.L',
                          },
                          {
                            address: '2a06:98c1:50::ac40:20f7',
                            registrantName: 'MNT-CLOUDFLARE',
                          },
                        ],
                      },
                      {
                        hostname: 'paul.ns.cloudflare.com',
                        ips: [
                          {
                            address: '108.162.193.135',
                            registrantName: 'Cloudflare, Inc.',
                          },
                          {
                            address: '173.245.59.135',
                            registrantName: 'Cloudflare, Inc.',
                          },
                          {
                            address: '172.64.33.135',
                            registrantName: 'Cloudflare, Inc.',
                          },
                          {
                            address: '2803:f800:50::6ca2:c187',
                            registrantName: 'CloudFlare Latin America S.R.L',
                          },
                          {
                            address: '2606:4700:58::adf5:3b87',
                            registrantName: 'Cloudflare, Inc.',
                          },
                          {
                            address: '2a06:98c1:50::ac40:2187',
                            registrantName: 'MNT-CLOUDFLARE',
                          },
                        ],
                      },
                    ],
                  },
                },
                nameservers: ['ns1.datum-staging.net', 'ns2.datum-staging.net'],
                recordCount: 13,
              },
            },
          ],
          kind: 'DNSZoneList',
          metadata: {
            continue: '',
            resourceVersion: '302273856',
          },
        },
      } as unknown as DNSZoneListResponse);
    }, 1000);
  });
};

export const projectDomainListQuery = (projectName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/networking.datumapis.com/v1alpha/domains`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(DomainListResponseSchema)
    .execute();
};

export const projectDomainStatusQuery = (
  projectName: string,
  domainName: string,
  namespace: string = 'default'
) => {
  return apiRequestClient({
    method: 'GET',
    url: `apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/networking.datumapis.com/v1alpha/namespaces/${namespace}/domains/${domainName}/status`,
  })
    .output(DomainResponseSchema)
    .execute();
};

export const projectDeleteMutation = (projectName: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}`,
  }).execute();
};

export const useProjectListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['projects', 'list', params],
    queryFn: () => projectListQuery(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

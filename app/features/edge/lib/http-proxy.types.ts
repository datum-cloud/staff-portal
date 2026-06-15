import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@openapi/networking.datumapis.com/v1alpha';

export type TrafficProtectionMode = 'Observe' | 'Enforce' | 'Disabled';

export type HttpProxyComplexity = 'simple' | 'host-only' | 'advanced';

export type HostnameStatus = {
  hostname: string;
  conditions?: Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    reason: string;
    message: string;
    lastTransitionTime: string;
    observedGeneration?: number;
  }>;
};

export type HttpProxy = {
  uid: string;
  name: string;
  namespace?: string;
  resourceVersion: string;
  createdAt: string;
  endpoint?: string;
  origins?: string[];
  hostnames?: string[];
  tlsHostname?: string;
  status?: ComDatumapisNetworkingV1AlphaHttpProxy['status'];
  chosenName?: string;
  canonicalHostname?: string;
  hostnameStatuses?: HostnameStatus[];
  trafficProtectionMode?: TrafficProtectionMode;
  paranoiaLevels?: { blocking?: number; detection?: number };
  enableHttpRedirect?: boolean;
  connector?: { name: string };
  basicAuthEnabled?: boolean;
  basicAuthUserCount?: number;
  basicAuthUsernames?: string[];
  hostHeader?: string;
  complexity?: HttpProxyComplexity;
};

export type EdgeDetailBundle = {
  raw: ComDatumapisNetworkingV1AlphaHttpProxy;
  proxy: HttpProxy;
};

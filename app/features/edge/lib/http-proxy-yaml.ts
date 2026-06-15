import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@openapi/networking.datumapis.com/v1alpha';
import { dump } from 'js-yaml';

export function toHttpProxyYaml(raw: ComDatumapisNetworkingV1AlphaHttpProxy): string {
  return dump(raw, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
}

import type { ComMiloapisServicesV1Alpha1ServiceConsumer } from '@openapi/services.miloapis.com/v1alpha1';

/**
 * The controller writes `spec.serviceRef.name` as either the Service's
 * `metadata.name` or its canonical `spec.serviceName` depending on the
 * record's age/version, so when filtering consumers for a given service we
 * need to accept either form.
 */
export function consumerMatchesService(
  consumer: ComMiloapisServicesV1Alpha1ServiceConsumer,
  serviceName: string,
  canonicalName: string | undefined
): boolean {
  const ref = consumer.spec?.serviceRef?.name;
  if (!ref) return false;
  return ref === serviceName || (!!canonicalName && ref === canonicalName);
}

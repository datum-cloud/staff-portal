import type { Route } from './+types/index';
import BadgeState from '@/components/badge-state';
import { Text, Title } from '@/components/typography';
import { Organization } from '@/resources/schemas/organization.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Organization>(
    matches,
    'routes/customer/organization/detail/layout'
  );
  return metaObject(`Detail - ${data?.metadata?.annotations?.['kubernetes.io/display-name']}`);
};

export default function CustomerOrganizationDetail() {
  const data = useRouteLoaderData('routes/customer/organization/detail/layout') as Organization;

  return (
    <div className="m-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <Title>{data?.metadata?.annotations?.['kubernetes.io/display-name']}</Title>
        <BadgeState state={data?.spec?.type} />
      </div>
      <Text textColor="muted">{data?.metadata?.name}</Text>
    </div>
  );
}

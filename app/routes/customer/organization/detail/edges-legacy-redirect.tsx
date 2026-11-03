import { redirect, type LoaderFunctionArgs } from 'react-router';

/** Permanent redirect from legacy `/edges` to `/albs` under an organization. */
export async function loader({ url, params }: LoaderFunctionArgs) {
  const orgName = params.orgName ?? '';
  const destination =
    url.pathname.replace(
      `/customers/organizations/${orgName}/edges`,
      `/customers/organizations/${orgName}/albs`
    ) + url.search;
  return redirect(destination, 308);
}

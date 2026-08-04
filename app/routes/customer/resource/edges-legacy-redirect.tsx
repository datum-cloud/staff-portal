import { redirect, type LoaderFunctionArgs } from 'react-router';

/** Permanent redirect from legacy `/customers/resources/edges` to `/albs`. */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const destination =
    url.pathname.replace('/customers/resources/edges', '/customers/resources/albs') + url.search;
  return redirect(destination, 308);
}

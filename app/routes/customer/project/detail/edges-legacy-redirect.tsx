import { redirect, type LoaderFunctionArgs } from 'react-router';

/** Permanent redirect from legacy `/edges` to `/albs` under a project. */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const projectName = params.projectName ?? '';
  const destination =
    url.pathname.replace(
      `/customers/projects/${projectName}/edges`,
      `/customers/projects/${projectName}/albs`
    ) + url.search;
  return redirect(destination, 308);
}

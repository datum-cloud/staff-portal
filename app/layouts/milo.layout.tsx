import type { Route } from './+types/milo.layout';
import { AssistantPanel, AssistantProvider } from '@/features/assistant';
import { MiloShell } from '@/features/milo';
import { useEnv } from '@/hooks';
import { authenticator } from '@/modules/auth';
import { AppProvider } from '@/providers/app.provider';
import { userDetailQuery } from '@/resources/request/server';
import { userGroupMembershipsQuery } from '@/resources/request/server/group.request';
import { env } from '@/utils/config/env.server';
import { getLoginUrl, getRedirectToPath } from '@/utils/cookies';
import { metaObject } from '@/utils/helpers';
import { SidebarProvider } from '@datum-cloud/datum-ui/sidebar';
import { TaskQueueProvider } from '@datum-cloud/datum-ui/task-queue';
import { data, redirect, useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

// Same auth + staff-gate as the legacy private.layout. Kept inline (rather than
// re-exported) so React Router treats this route module's server-only imports
// correctly and strips them from the client bundle.
export async function loader({ request }: Route.LoaderArgs) {
  const isAuthenticated = await authenticator.isAuthenticated(request);
  if (!isAuthenticated) {
    return redirect(getLoginUrl(getRedirectToPath(request.url)));
  }

  const isValid = await authenticator.isValidSession(request);
  if (!isValid) {
    return redirect('/logout');
  }

  const session = await authenticator.getSession(request);
  const token = session?.accessToken ?? '';
  const userId = session?.sub ?? '';

  let isStaff = false;
  try {
    const memberships = await userGroupMembershipsQuery(token, userId);
    isStaff = memberships.some((m) => m.spec?.groupRef?.name === env.staffGroupName);
  } catch (error) {
    if (error instanceof Response && (error.status === 401 || error.status === 403)) {
      isStaff = false;
    } else {
      throw error;
    }
  }
  if (!isStaff) {
    return redirect('/error/unauthorized');
  }

  const user = await userDetailQuery(token, userId);

  return data({ user });
}

export default function MiloLayout() {
  const data = useLoaderData<typeof loader>();
  const env = useEnv();

  const content = (
    <AppProvider user={data?.user ?? undefined}>
      <TaskQueueProvider config={{ storageType: 'memory' }}>
        {/* SidebarProvider supplies the useSidebar context that existing pages'
            legacy SubLayout still needs. It wraps the whole shell (not individual
            pages) so page content keeps a normal block layout. Removed once pages
            migrate to the Milo page templates (#777). */}
        <SidebarProvider defaultOpen={false}>
          <MiloShell />
          {/* AssistantPanel uses useSidebar, so it must live inside SidebarProvider. */}
          {env?.CHATBOT_ENABLED && <AssistantPanel />}
        </SidebarProvider>
      </TaskQueueProvider>
    </AppProvider>
  );

  if (env?.CHATBOT_ENABLED) {
    return <AssistantProvider>{content}</AssistantProvider>;
  }

  return content;
}

import type { Route } from './+types/public.layout';
import { AppSidebar } from '@/components/app-sidebar';
import AppToolbar from '@/components/app-toolbar';
import AppTopbar from '@/components/app-topbar';
import { AssistantPanel, AssistantProvider } from '@/features/assistant';
import { useEnv } from '@/hooks';
import { authenticator } from '@/modules/auth';
import { AppProvider } from '@/providers/app.provider';
import { userDetailQuery } from '@/resources/request/server';
import { userGroupMembershipsQuery } from '@/resources/request/server/group.request';
import { env } from '@/utils/config/env.server';
import { getLoginUrl, getRedirectToPath } from '@/utils/cookies';
import { metaObject } from '@/utils/helpers';
import { SidebarInset, SidebarProvider } from '@datum-cloud/datum-ui/sidebar';
import { TaskQueueProvider } from '@datum-cloud/datum-ui/task-queue';
import { data, Outlet, redirect, useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

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

  // Check staff group membership before allowing access.
  // 401 = token expired or from a different cluster → clear session and re-login.
  // 403 = valid token but no list permission → user is not staff.
  // Other errors (network, 500) are re-thrown so they surface properly.
  let isStaff = false;
  try {
    const memberships = await userGroupMembershipsQuery(token, userId);
    isStaff = memberships.some((m) => m.spec?.groupRef?.name === env.staffGroupName);
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      // Stale session (e.g. cluster was restarted). Redirect to logout so the
      // user is sent back to the login page with a clean session rather than
      // seeing a confusing "unauthorized" error page.
      return redirect('/logout');
    }
    if (error instanceof Response && error.status === 403) {
      isStaff = false;
    } else if (!(error instanceof Response)) {
      throw error;
    }
  }
  if (!isStaff) {
    return redirect('/error/unauthorized');
  }

  const user = await userDetailQuery(token, userId);

  return data({ user });
}

export default function PrivateLayout() {
  const data = useLoaderData<typeof loader>();
  const env = useEnv();

  const content = (
    <AppProvider user={data.user ?? undefined}>
      <TaskQueueProvider config={{ storageType: 'memory' }}>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset>
            <AppTopbar />
            <AppToolbar />
            <Outlet />
          </SidebarInset>
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

import type { Route } from './+types/milo.layout';
import { AssistantPanel, AssistantProvider } from '@/features/assistant';
import { MiloShell } from '@/features/milo';
import { useEnv } from '@/hooks';
import { requireStaffUser } from '@/modules/auth/require-staff.server';
import { AppProvider } from '@/providers/app.provider';
import { metaObject } from '@/utils/helpers';
import { SidebarProvider } from '@datum-cloud/datum-ui/sidebar';
import { TaskQueueProvider } from '@datum-cloud/datum-ui/task-queue';
import { data, useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

export async function loader({ request }: Route.LoaderArgs) {
  return data(await requireStaffUser(request));
}

export default function MiloLayout() {
  const data = useLoaderData<typeof loader>();
  const env = useEnv();

  const content = (
    <AppProvider user={data?.user ?? undefined}>
      <TaskQueueProvider config={{ storageType: 'memory' }}>
        {/* SidebarProvider supplies the ambient useSidebar context that
            legacy SubLayout's menu (app/components/sub-layout/sidebar-menu*.tsx)
            still needs — it renders datum-ui's SidebarMenuButton, which calls
            useSidebar() internally and throws without a provider ancestor.
            Wraps the whole shell (not individual pages) so page content keeps
            a normal block layout. Unrelated to MiloSubNav (the left rail),
            which nests its own scoped provider — see the sub-nav parity
            plan's Phase 0a/2. Removed once pages migrate to the Milo page
            templates (#777). */}
        <SidebarProvider defaultOpen={false}>
          <MiloShell />
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

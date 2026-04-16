import AppSearch from '@/components/app-search';
import AppSearchMobile from '@/components/app-search/app-search-mobile';
import { AssistantTrigger } from '@/features/assistant';
import { useEnv } from '@/hooks';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Separator } from '@datum-cloud/datum-ui/separator';
import { SidebarTrigger } from '@datum-cloud/datum-ui/sidebar';
import { TaskQueueDropdown } from '@datum-cloud/datum-ui/task-queue';

const AppTopbar = () => {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const env = useEnv();

  return (
    <header className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      {!isMobile && <AppSearch />}
      <div className="ml-auto flex items-center space-x-2">
        {isMobile && <AppSearchMobile />}
        {env?.CHATBOT_ENABLED && <AssistantTrigger />}
        <TaskQueueDropdown />
      </div>
    </header>
  );
};

export default AppTopbar;

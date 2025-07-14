import ThemeSwitcher from '@/components/theme-switcher';
import { Separator } from '@/modules/shadcn/ui/separator';
import { SidebarTrigger } from '@/modules/shadcn/ui/sidebar';

const AppTopbar = () => {
  return (
    <header className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      {/* <AppSearch /> */}
      <div className="ml-auto flex items-center space-x-4">
        <ThemeSwitcher />
      </div>
    </header>
  );
};

export default AppTopbar;

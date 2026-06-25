import { MiloAssistantTrigger } from './milo-assistant-trigger';
import { MiloSearch } from './milo-search';
import { MiloTaskQueue } from './milo-task-queue';
import { MiloThemeToggle } from './milo-theme-toggle';
import { MiloUserMenu } from './milo-user-menu';
import { useEnv } from '@/hooks';

/**
 * Right side of the navbar: a row of uniform icon-button actions (search,
 * theme), the assistant + task-queue, and the user avatar menu. All share the
 * MiloIconButton style so the cluster reads as one consistent set.
 */
export function MiloRightCluster() {
  const env = useEnv();

  return (
    <div className="flex h-full items-center gap-1 border-l pl-4">
      <MiloSearch />
      <MiloThemeToggle />
      {env?.CHATBOT_ENABLED && <MiloAssistantTrigger />}
      <MiloTaskQueue />
      <MiloUserMenu />
    </div>
  );
}

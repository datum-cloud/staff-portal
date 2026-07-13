import { MiloSearch } from './milo-search';
import { MiloTaskQueue } from './milo-task-queue';
import { MiloThemeToggle } from './milo-theme-toggle';
import { MiloUserMenu } from './milo-user-menu';

/**
 * Right side of the navbar: a row of uniform icon-button actions (search,
 * theme), the task-queue, and the user avatar menu. All share the
 * MiloIconButton style so the cluster reads as one consistent set.
 *
 * The assistant trigger is intentionally omitted: the assistant now lives as
 * the full-page dashboard (`/`), so the navbar slide-up button is redundant.
 */
export function MiloRightCluster() {
  return (
    <div className="flex h-full items-center gap-1 border-l pl-4">
      <MiloSearch />
      <MiloThemeToggle />
      <MiloTaskQueue />
      <MiloUserMenu />
    </div>
  );
}

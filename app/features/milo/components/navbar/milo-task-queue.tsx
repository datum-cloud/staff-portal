import { TaskQueueDropdown } from '@datum-cloud/datum-ui/task-queue';

/**
 * Task queue dropdown styled to match the navbar icon buttons. TaskQueueDropdown
 * exposes no style props, so its inner borderless button is restyled via scoped
 * descendant classes that mirror miloIconButtonClass. If a datum-ui upgrade
 * changes the dropdown's internal markup, update the selectors here.
 */
export function MiloTaskQueue() {
  return (
    <div className="[&_button]:text-foreground [&_button]:hover:bg-foreground/5 [&_svg]:text-foreground [&_button]:size-8 [&_button]:rounded-lg [&_svg]:size-4">
      <TaskQueueDropdown />
    </div>
  );
}

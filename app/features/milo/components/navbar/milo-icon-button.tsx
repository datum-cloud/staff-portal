import { Button } from '@datum-cloud/datum-ui/button';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { type ReactNode } from 'react';

/** Shared class for navbar icon-button actions; reuse for non-Button triggers. */
export const miloIconButtonClass =
  'text-foreground hover:bg-foreground/5 size-8 rounded-lg [&_svg]:size-4';

interface MiloIconButtonProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

/**
 * Shared style for every navbar right-cluster action so search, notifications,
 * theme, etc. read as one consistent set. Borderless ghost icon button with the
 * header icon colour and a tooltip from `label`.
 */
export function MiloIconButton({ label, icon, onClick, active, className }: MiloIconButtonProps) {
  return (
    <Tooltip message={label}>
      <Button
        htmlType="button"
        type="tertiary"
        theme="borderless"
        size="icon"
        onClick={onClick}
        aria-label={label}
        className={cn(miloIconButtonClass, active && 'bg-foreground/5', className)}>
        {icon}
      </Button>
    </Tooltip>
  );
}

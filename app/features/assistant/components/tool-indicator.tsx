import type { ActiveTool } from '@/features/assistant/types';
import { Loader2Icon } from 'lucide-react';
import React from 'react';

interface ToolIndicatorProps {
  activeTool: ActiveTool;
}

/**
 * Displays a "Searching..." / "Looking up..." indicator while Claude is
 * executing a tool call. The aria-live region is on the parent container
 * in AssistantDrawer; this component itself does not nest an aria-live.
 */
export function ToolIndicator({ activeTool }: ToolIndicatorProps) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
      <Loader2Icon className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
      <span>{activeTool.label}</span>
    </div>
  );
}

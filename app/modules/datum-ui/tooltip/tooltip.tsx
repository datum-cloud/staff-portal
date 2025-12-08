import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipTrigger,
} from '@/modules/shadcn/ui/tooltip';
import { ReactNode } from 'react';

interface TooltipProps {
  message: string | ReactNode;
  children: ReactNode;
  delayDuration?: number;
  maxWidth?: number;
}

export default function Tooltip({
  message,
  children,
  delayDuration = 200,
  maxWidth = 450,
}: TooltipProps) {
  return (
    <TooltipPrimitive delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        className="text-sm break-words whitespace-normal"
        style={{ maxWidth: `${maxWidth}px` }}>
        <span>{message}</span>
      </TooltipContent>
    </TooltipPrimitive>
  );
}

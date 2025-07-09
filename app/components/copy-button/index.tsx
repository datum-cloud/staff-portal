import { Button } from '@/modules/shadcn/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/modules/shadcn/ui/tooltip';
import { toast } from '@/modules/toast';
import { Copy } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  successMessage?: string;
  errorMessage?: string;
  tooltipText?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'ghost' | 'outline' | 'default';
}

function CopyButton({
  value,
  successMessage = 'Copied to clipboard',
  errorMessage = 'Failed to copy',
  tooltipText = 'Copy',
  size = 'sm',
  variant = 'ghost',
}: CopyButtonProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (err) {
      toast.error(errorMessage);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          onClick={handleCopy}
          className={size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'}>
          <Copy className={size === 'sm' ? 'h-4 w-4' : 'h-4 w-4'} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

export default CopyButton;

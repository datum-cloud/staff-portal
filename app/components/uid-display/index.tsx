import { Button } from '@/modules/shadcn/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/modules/shadcn/ui/tooltip';
import { toast } from '@/modules/toast';
import { Copy } from 'lucide-react';

function truncateMiddle(str: string, maxLength = 16) {
  if (str.length <= maxLength) return str;
  const half = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}

function UIDDisplay({ value }: { value: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('UUID copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy UID');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span>{truncateMiddle(value)}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6">
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy UUID</TooltipContent>
      </Tooltip>
    </div>
  );
}

export default UIDDisplay;

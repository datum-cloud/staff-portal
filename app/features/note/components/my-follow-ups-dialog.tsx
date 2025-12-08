import { FollowUpsList } from './follow-ups-list';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/modules/shadcn/ui/dialog';
import { Button } from '@datum-ui/button';
import { Trans } from '@lingui/react/macro';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';

interface MyFollowUpsDialogProps {
  trigger?: React.ReactNode;
}

export const MyFollowUpsDialog: React.FC<MyFollowUpsDialogProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button theme="borderless" size="small" icon={<ClipboardList size={16} />}>
            <Trans>My Follow-ups</Trans>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] w-fit min-w-[400px] flex-col overflow-hidden sm:max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>
            <Trans>Follow-ups</Trans>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">{open && <FollowUpsList />}</div>
      </DialogContent>
    </Dialog>
  );
};

import ConfirmDialog from '@/components/confirm-dialog';
import Tooltip from '@/components/tooltip';
import { Button } from '@/modules/shadcn/ui/button';
import { Trans, useLingui } from '@lingui/react/macro';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';

interface DeleteActionButtonProps {
  /** The type of item being deleted (e.g., "Project", "Organization", "User") */
  itemType: string;
  /** The description text for the confirmation dialog */
  description: string;
  /** The function to call when delete is confirmed */
  onConfirm: () => void | Promise<void>;
  /** Optional additional props for the button */
  buttonProps?: React.ComponentProps<typeof Button>;
}

export default function DeleteActionButton({
  itemType,
  description,
  onConfirm,
  buttonProps = {},
}: DeleteActionButtonProps) {
  const { t } = useLingui();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t`Delete ${itemType}`}
        description={description}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={handleConfirm}
        requireConfirmation
      />

      <Tooltip message={<Trans>Delete</Trans>}>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          {...buttonProps}>
          <Trash2Icon />
        </Button>
      </Tooltip>
    </>
  );
}

import { Button } from './button-enhanced';
import DialogConfirm from '@/components/dialog/dialog-confirm';
import { Tooltip } from '@/components/tooltip';
import { Trans, useLingui } from '@lingui/react/macro';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';

interface ButtonDeleteActionProps {
  /** The type of item being deleted (e.g., "Project", "Organization", "User") */
  itemType: string;
  /** The description text for the confirmation dialog */
  description: string;
  /** The function to call when delete is confirmed */
  onConfirm: () => void | Promise<void>;
  /** Optional additional props for the button */
  buttonProps?: React.ComponentProps<typeof Button>;
  tooltip?: string;
}

export default function ButtonDeleteAction({
  itemType,
  description,
  onConfirm,
  buttonProps = {},
  tooltip,
}: ButtonDeleteActionProps) {
  const { t } = useLingui();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DialogConfirm
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

      <Tooltip message={tooltip || <Trans>Delete</Trans>}>
        <Button
          type="danger"
          theme="light"
          size="icon"
          onClick={() => setDeleteDialogOpen(true)}
          {...buttonProps}>
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </Tooltip>
    </>
  );
}

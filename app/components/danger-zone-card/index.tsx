import { ActionCard } from '@/components/action-card';
import { DialogConfirm } from '@/components/dialog';
import { SectionCard } from '@/features/milo/components/page/section-card';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';

interface DangerZoneCardProps {
  /** The title for the delete action (e.g., "Delete User", "Delete Project") */
  deleteTitle: string;
  /** The description for the delete action */
  deleteDescription: string;
  /** The dialog title for confirmation */
  dialogTitle: string;
  /** The dialog description for confirmation */
  dialogDescription: string;
  /** Callback function when the delete is confirmed */
  onConfirm: () => void | Promise<void>;
  /** Optional additional CSS classes for the card */
  className?: string;
}

export function DangerZoneCard({
  deleteTitle,
  deleteDescription,
  dialogTitle,
  dialogDescription,
  onConfirm,
  className,
}: DangerZoneCardProps) {
  const { t } = useLingui();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <DialogConfirm
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={dialogTitle}
        description={dialogDescription}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={onConfirm}
        requireConfirmation
      />

      <SectionCard
        className={`border-destructive/20 mt-4 ${className || ''}`}
        title={
          <span className="text-destructive flex items-center gap-2">
            <ACTION_ICONS.delete className="h-4 w-4" />
            <Trans>Danger Zone</Trans>
          </span>
        }
        description={<Trans>Irreversible and destructive actions</Trans>}>
        <ActionCard
          variant="destructive"
          title={deleteTitle}
          description={deleteDescription}
          action={
            <Button type="danger" size="small" onClick={() => setDeleteDialogOpen(true)}>
              <Trans>Delete</Trans>
            </Button>
          }
        />
      </SectionCard>
    </>
  );
}

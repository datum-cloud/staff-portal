import { ActionCard } from '@/components/action-card';
import { DialogConfirm } from '@/components/dialog';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Trans, useLingui } from '@lingui/react/macro';
import { Trash2Icon } from 'lucide-react';
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

      <Card className={`border-destructive/20 mt-4 shadow-none ${className || ''}`}>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2Icon className="h-4 w-4" />
            <Trans>Danger Zone</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Irreversible and destructive actions</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </>
  );
}

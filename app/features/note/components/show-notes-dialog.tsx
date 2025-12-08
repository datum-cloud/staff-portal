import { NoteList } from './note-list';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/modules/shadcn/ui/dialog';
import { NoteSubjectRef } from '@/resources/request/client/note.request';
import { Button } from '@datum-ui/button';
import { Trans, useLingui } from '@lingui/react/macro';
import { FileText } from 'lucide-react';
import { useState } from 'react';

interface ShowNotesDialogProps {
  subjectRef: NoteSubjectRef;
  refreshTrigger?: number;
}

export const ShowNotesDialog: React.FC<ShowNotesDialogProps> = ({ subjectRef, refreshTrigger }) => {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        theme="outline"
        size="small"
        icon={<FileText size={16} />}
        onClick={() => setOpen(true)}>
        <Trans>List Notes</Trans>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] w-full !max-w-[90vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t`Notes`}</DialogTitle>
          </DialogHeader>
          <NoteList subjectRef={subjectRef} embedded refreshTrigger={refreshTrigger} />
        </DialogContent>
      </Dialog>
    </>
  );
};

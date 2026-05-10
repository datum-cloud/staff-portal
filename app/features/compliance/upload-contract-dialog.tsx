import { extractionToFormValues } from './extract-mapping';
import type { ContractExtraction } from './extract-schema';
import type { VendorFormValues } from './vendor-form';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { FileTextIcon, UploadIcon } from 'lucide-react';
import { useRef, useState } from 'react';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

interface UploadContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with prefill values once the PDF has been extracted. */
  onExtracted: (values: VendorFormValues, sourceKey: string) => void;
}

interface ExtractError {
  code?: string;
  message?: string;
}

export function UploadContractDialog({
  open,
  onOpenChange,
  onExtracted,
}: UploadContractDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    if (isExtracting) return;
    reset();
    onOpenChange(false);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    setErrorMessage(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (next.type !== 'application/pdf') {
      setErrorMessage(t`Only PDF files are supported.`);
      setFile(null);
      return;
    }
    if (next.size > MAX_PDF_BYTES) {
      setErrorMessage(t`PDF must be under ${MAX_PDF_BYTES / (1024 * 1024)} MB.`);
      setFile(null);
      return;
    }
    setFile(next);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/internal/compliance/extract-contract', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ExtractError;
        const fallback =
          response.status === 503
            ? t`Contract OCR is not configured for this deployment.`
            : t`Couldn't extract this contract.`;
        const message = body.message ?? fallback;
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      const extraction = (await response.json()) as ContractExtraction;
      const values = extractionToFormValues(extraction);
      const sourceKey = `${file.name}-${file.size}-${file.lastModified}`;

      reset();
      onOpenChange(false);
      onExtracted(values, sourceKey);
      toast.success(t`Contract extracted. Review the prefilled fields before saving.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t`Couldn't reach the extraction service.`;
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <Dialog.Content className="sm:max-w-lg">
        <Dialog.Header
          title={t`Upload contract`}
          description={t`Drop a vendor DPA or MSA. Datum sends it to Anthropic to extract compliance fields and prefills the new vendor form. The PDF is not stored.`}
        />
        <Dialog.Body className="space-y-4 px-5">
          <label
            htmlFor="contract-upload-input"
            className="border-input-border bg-input-background/40 hover:bg-input-background flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center transition-colors">
            <UploadIcon className="text-muted-foreground size-6" />
            <Text size="sm" weight="medium">
              {file ? file.name : <Trans>Click to choose a PDF</Trans>}
            </Text>
            <Text size="xs" textColor="muted">
              <Trans>PDF only, up to 10 MB.</Trans>
            </Text>
            <input
              id="contract-upload-input"
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={handleSelect}
              disabled={isExtracting}
            />
          </label>

          {file && !errorMessage && (
            <div className="flex items-center gap-2">
              <FileTextIcon className="text-muted-foreground size-4" />
              <Text size="sm" textColor="muted" className="truncate">
                {(file.size / 1024).toFixed(0)} KB
              </Text>
            </div>
          )}

          {errorMessage && (
            <Text size="sm" className="text-destructive">
              {errorMessage}
            </Text>
          )}
        </Dialog.Body>

        <Dialog.Footer className="gap-2">
          <Button
            type="tertiary"
            theme="borderless"
            htmlType="button"
            onClick={handleClose}
            disabled={isExtracting}
            className="flex-1 sm:flex-none">
            {t`Cancel`}
          </Button>
          <Button
            type="primary"
            theme="solid"
            htmlType="button"
            disabled={!file || isExtracting}
            loading={isExtracting}
            onClick={handleSubmit}
            className="flex-1 sm:flex-none">
            {isExtracting ? t`Extracting...` : t`Extract`}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

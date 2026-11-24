import { useAccountPaymentMethods } from '../../hooks';
import {
  buildChargeDraftSpec,
  buildChargeSpec,
  CHARGE_DRAFT_SEND_ANNOTATION,
  chargeDraftSendAnnotations,
  catalogPricingName,
  chargeAmounts,
  chargeFormValuesFromLine,
  chargeInvoiceGroup,
  chargeInvoiceGroupName,
  chargeItemOptions,
  chargeName,
  chargeSummary,
  currentBillingPeriod,
  emptyChargeFormValues,
  formatChargeMoney,
  formatServicePeriod,
  invoiceNowOutcome,
  isBeforePeriod,
  isEmptyChargeForm,
  isoDay,
  MAX_CHARGE_NOTE,
  nextBillingPeriod,
  parseHundredths,
  pricingUnitAmount,
  readChargeDraftSend,
  type ChargeDraft,
  type ChargeFormValues,
  type ChargeInvoiceTiming,
  type ServicePeriod,
} from '../../lib/charges';
import { startOfUtcDay } from '../../lib/contract';
import {
  DEFAULT_SERVICE_PRICING_NAMESPACE,
  getBillingAccountDisplayName,
  type BillingAccount,
} from '../../utils';
import { ShowSubmitErrors } from '../contract-editor/show-submit-errors';
import { ItemOptions, SupplyDateField } from '../item-options';
import { ChargeItemPicker, PickedItemInfo } from './charge-item-picker';
import { buildChargeSchema } from './schema';
import { chargeDraftServerErrors, chargeServerErrors } from './server-errors';
import {
  useChargeListForAccountQuery,
  useCreateChargeMutation,
  useDeleteChargeDraftMutation,
  useSaveChargeDraftMutation,
  useServicePricingListQuery,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Alert, AlertDescription } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Label } from '@datum-cloud/datum-ui/label';
import { RadioGroupItem } from '@datum-cloud/datum-ui/radio-group';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Plus, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useWatch, type FieldErrors, type UseFormReturn } from 'react-hook-form';

/** The fields under "Item options", which open when one of them has an error. */
const OPTION_FIELDS: (keyof ChargeFormValues)[] = [
  'taxCode',
  'notTaxable',
  'discountPercent',
  'periodStart',
  'periodEnd',
  'note',
];

/** One line in the dialog: a charge it adds, and whether it's added already. */
interface ChargeLine {
  /** Stable across tries, for the charge's name. */
  id: string;
  values: ChargeFormValues;
  added: boolean;
}

/** What invoicing now confirms: the lines and when they're invoiced. */
interface PendingSend {
  lines: ChargeLine[];
  invoice: ChargeInvoiceTiming;
}

let nextLineId = 0;
const newLineId = () => `line-${++nextLineId}`;

/**
 * Adds charges to the account, laid out like a line in Stripe's invoice
 * editor: the item, quantity and price, then item options (tax, discount,
 * supply date, a note for staff), when it's invoiced, and the line as the
 * invoice will show it. "Add another line" keeps the line and starts a new
 * one; invoiced now, the lines go out together on one invoice. Invoicing now
 * asks to confirm first.
 *
 * Mount it only while it's open: the date its defaults and limits are
 * worked out from is taken when it opens, as billing's webhook will take
 * its own when the charge is sent.
 */
export function AddChargeDialog({
  orgName,
  account,
  draft,
  canSaveDraft = false,
  onClose,
}: {
  orgName: string;
  account: BillingAccount;
  /** A saved draft to change or send, instead of starting empty. */
  draft?: ChargeDraft;
  /** Whether billing serves charge drafts, so lines can be saved as one. */
  canSaveDraft?: boolean;
  onClose: () => void;
}) {
  const [now] = useState(() => new Date());
  const pricingsQuery = useServicePricingListQuery(DEFAULT_SERVICE_PRICING_NAMESPACE);
  // Closing goes through the form, which asks first when some lines are
  // added and the rest would be lost.
  const requestCloseRef = useRef<() => void>(onClose);
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : requestCloseRef.current())}>
      <Dialog.Content className="sm:max-w-2xl">
        <Dialog.Header
          title={draft ? t`Draft charges` : t`Add charge`}
          description={
            draft
              ? t`Charges saved for ${getBillingAccountDisplayName(account)}. Change them and save the draft, or add them now.`
              : t`A one-off line on ${getBillingAccountDisplayName(account)}'s invoice: a catalog item or a custom one.`
          }
        />
        {pricingsQuery.isLoading ? (
          <Dialog.Body className="flex flex-col gap-3 px-5" aria-busy="true">
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-2/3 rounded" />
            <Skeleton className="h-24 w-full rounded" />
          </Dialog.Body>
        ) : (
          <AddChargeForm
            orgName={orgName}
            account={account}
            now={now}
            pricings={pricingsQuery.data?.items ?? []}
            catalogFailed={pricingsQuery.isError}
            draft={draft}
            canSaveDraft={canSaveDraft || Boolean(draft)}
            onClose={onClose}
            requestCloseRef={requestCloseRef}
          />
        )}
      </Dialog.Content>
    </Dialog>
  );
}

function AddChargeForm({
  orgName,
  account,
  now,
  pricings,
  catalogFailed,
  draft,
  canSaveDraft,
  onClose,
  requestCloseRef,
}: {
  orgName: string;
  account: BillingAccount;
  now: Date;
  pricings: NonNullable<ReturnType<typeof useServicePricingListQuery>['data']>['items'];
  catalogFailed: boolean;
  draft?: ChargeDraft;
  canSaveDraft: boolean;
  onClose: () => void;
  requestCloseRef: { current: () => void };
}) {
  const accountName = account.metadata?.name ?? '';
  const accountDisplayName = getBillingAccountDisplayName(account);
  const createCharge = useCreateChargeMutation(orgName, accountName);
  const schema = useMemo(() => buildChargeSchema(now), [now]);
  const currentPeriod = useMemo(() => currentBillingPeriod(account, now), [account, now]);
  const options = useMemo(() => chargeItemOptions(pricings, account), [pricings, account]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const initialInvoice = draft?.spec.invoice ?? 'NextInvoice';
  // A send of this draft that stopped partway: its charges' names and
  // invoice group, so the rest join the same invoice.
  const [sendRecord] = useState(() => readChargeDraftSend(draft));
  const [initial] = useState(() => {
    const lines: ChargeLine[] = (draft?.spec.lines ?? []).map((line) => ({
      id: newLineId(),
      values: chargeFormValuesFromLine(line, initialInvoice),
      added: false,
    }));
    const names = new Map<string, string>();
    sendRecord?.names.forEach((name, index) => names.set(lines[index].id, name));
    return { lines, names };
  });
  // Lines kept with "Add another line", or a draft's: all but the one in
  // the form.
  const [lines, setLines] = useState<ChargeLine[]>(initial.lines);
  // The line in the form, so it keeps its charge's name if it comes back.
  const formLineIdRef = useRef(newLineId());
  // Where the line in the form goes among the kept ones: at the end, or,
  // while a kept line is being changed, back in its place.
  const [formAt, setFormAt] = useState<number | null>(null);
  const withFormLine = (kept: ChargeLine[], line: ChargeLine) => {
    const at = formAt ?? kept.length;
    return [...kept.slice(0, at), line, ...kept.slice(at)];
  };
  const saveDraft = useSaveChargeDraftMutation(orgName, accountName);
  const deleteDraft = useDeleteChargeDraftMutation(orgName, accountName);
  // The draft as last saved, for its latest version.
  const draftRef = useRef(draft);
  // Invoicing now confirms in a second step, with every line.
  const [confirming, setConfirming] = useState<PendingSend | null>(null);
  // What billing refused that isn't one field's, shown above the buttons.
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const formRef = useRef<UseFormReturn<ChargeFormValues> | null>(null);
  // Each line's charge name, picked on its first try and sent on every
  // retry, so a retry after a lost response can't add a second charge.
  const namesRef = useRef(initial.names);
  // The invoice group's name, picked once, so a retry joins the same group.
  const groupNameRef = useRef<string | null>(sendRecord?.group?.name ?? null);
  // Set while a create is in flight, so a double click sends it once.
  const sendingRef = useRef(false);
  // Once a line is added, the rest must join it as they are: same group
  // size and timing.
  const locked = lines.some((line) => line.added);

  // Lines of a recorded send whose charges exist are added already.
  const chargesQuery = useChargeListForAccountQuery(orgName, accountName);
  const markedRef = useRef(false);
  useEffect(() => {
    if (markedRef.current || !sendRecord || !chargesQuery.data) return;
    markedRef.current = true;
    const existing = new Set(chargesQuery.data.items.map((charge) => charge.metadata?.name));
    setLines((current) =>
      current.map((line) =>
        existing.has(namesRef.current.get(line.id)) ? { ...line, added: true } : line
      )
    );
  }, [sendRecord, chargesQuery.data]);

  // Closing with some lines added and the rest only here asks first. A
  // draft being sent keeps every line until they're all added, so it can be
  // picked up later.
  const [leaving, setLeaving] = useState(false);
  const requestClose = () => {
    if (locked && !draftRef.current) setLeaving(true);
    else onClose();
  };
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  // Each line's charge name, picked once.
  const nameFor = (line: ChargeLine) => {
    let name = namesRef.current.get(line.id);
    if (!name) {
      name = chargeName(line.values.description);
      namesRef.current.set(line.id, name);
    }
    return name;
  };

  const create = async ({ lines: all, invoice }: PendingSend) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setFormErrors([]);
    groupNameRef.current ??= chargeInvoiceGroupName();
    const group = chargeInvoiceGroup(invoice, all.length, groupNameRef.current);
    const added = new Set(all.filter((line) => line.added).map((line) => line.id));
    try {
      // A draft records the send before the first charge, and keeps every
      // line until all are added: if the send stops partway, the draft
      // still has the rest, and picking it up adds nothing twice.
      if (draftRef.current) {
        try {
          draftRef.current =
            (await saveDraft.mutateAsync({
              spec: buildChargeDraftSpec(
                all.map((line) => line.values),
                invoice,
                accountName
              ),
              draft: draftRef.current,
              annotations: chargeDraftSendAnnotations({ names: all.map(nameFor), group }),
            })) ?? draftRef.current;
        } catch (err) {
          setFormErrors(chargeDraftServerErrors(err));
          return;
        }
      }
      for (const line of all) {
        if (added.has(line.id)) continue;
        try {
          await createCharge.mutateAsync({
            spec: buildChargeSpec({ ...line.values, invoice }, accountName, group),
            name: nameFor(line),
          });
          added.add(line.id);
        } catch (err) {
          showFailure(err, line, all, added, invoice);
          return;
        }
      }
      await removeSentDraft();
      toast.success(successMessage(all.length, invoice));
      onClose();
    } finally {
      sendingRef.current = false;
    }
  };

  // Once every line is a charge, the draft goes.
  const removeSentDraft = async () => {
    const name = draftRef.current?.metadata?.name;
    if (!name) return;
    try {
      await deleteDraft.mutateAsync(name);
      draftRef.current = undefined;
    } catch {
      toast.error(
        t`The charges were added, but the draft couldn't be removed. Discard it from the charges card. Adding it again wouldn't add them twice.`
      );
    }
  };

  // Puts the line billing refused back in the form, with its errors on its
  // fields, and keeps the rest, marking those already added.
  const showFailure = (
    err: unknown,
    failed: ChargeLine,
    all: ChargeLine[],
    added: Set<string>,
    invoice: ChargeInvoiceTiming
  ) => {
    setConfirming(null);
    setLines(
      all
        .filter((line) => line.id !== failed.id)
        .map((line) => ({ ...line, added: added.has(line.id) }))
    );
    setFormAt(all.findIndex((line) => line.id === failed.id));
    formLineIdRef.current = failed.id;
    const form = formRef.current;
    form?.reset({ ...failed.values, invoice });
    const unplaced: string[] = [];
    if (added.size > 0) {
      const kept = draftRef.current
        ? t` The draft keeps the rest until they're all added.`
        : '';
      unplaced.push(
        (invoice === 'Now' && all.length > 1
          ? t`${added.size} of the ${all.length} lines are added. Fix this one and add it again: the invoice goes out once all of them are added.`
          : t`${added.size} of the ${all.length} lines are added. Fix this one and add it again.`) +
          kept
      );
    }
    for (const error of chargeServerErrors(err, failed.values.setPeriod)) {
      if (error.field && form) {
        form.setError(error.field, { type: 'server', message: error.message });
        if (OPTION_FIELDS.includes(error.field)) setOptionsOpen(true);
      } else {
        unplaced.push(error.message);
      }
    }
    setFormErrors(unplaced);
  };

  const send = async (all: ChargeLine[], invoice: ChargeInvoiceTiming) => {
    const pending = { lines: all, invoice };
    if (invoice === 'Now') {
      setFormErrors([]);
      setConfirming(pending);
      return;
    }
    await create(pending);
  };

  const handleSubmit = async (values: ChargeFormValues) => {
    await send(
      withFormLine(lines, { id: formLineIdRef.current, values, added: false }),
      values.invoice
    );
  };

  // Sends the kept lines without the form, when it's left empty.
  const sendKeptLines = async () => {
    const invoice = formRef.current?.getValues('invoice') ?? 'NextInvoice';
    await send(lines, invoice);
  };

  // Keeps the line in the form, once it's valid, and starts an empty one
  // with the same timing.
  const addAnotherLine = async () => {
    const form = formRef.current;
    if (!form) return;
    if (!(await form.trigger())) {
      if (hasOptionError(form.formState.errors)) setOptionsOpen(true);
      return;
    }
    const values = form.getValues();
    setLines((kept) => withFormLine(kept, { id: formLineIdRef.current, values, added: false }));
    setFormAt(null);
    formLineIdRef.current = newLineId();
    form.reset({ ...emptyChargeFormValues(), invoice: values.invoice });
    setOptionsOpen(false);
    setFormErrors([]);
  };

  // Puts a kept line back in the form to change it, keeping its place.
  // What's in the form is kept first, once it's valid.
  const editLine = async (id: string) => {
    const form = formRef.current;
    if (!form || !lines.some((line) => line.id === id)) return;
    const current = form.getValues();
    let kept = lines;
    if (!isEmptyChargeForm(current)) {
      if (!(await form.trigger())) {
        if (hasOptionError(form.formState.errors)) setOptionsOpen(true);
        return;
      }
      kept = withFormLine(lines, {
        id: formLineIdRef.current,
        values: form.getValues(),
        added: false,
      });
    }
    const at = kept.findIndex((line) => line.id === id);
    const line = kept[at];
    setLines(kept.filter((other) => other.id !== id));
    setFormAt(at);
    formLineIdRef.current = line.id;
    form.reset({ ...line.values, invoice: current.invoice });
    setOptionsOpen(false);
    setFormErrors([]);
  };

  // Saves the lines, with the one in the form once it's valid, as a draft
  // to check and send later, or saves the draft being changed.
  const saveAsDraft = async () => {
    const form = formRef.current;
    if (!form) return;
    const current = form.getValues();
    let all = lines;
    if (!isEmptyChargeForm(current) || lines.length === 0) {
      if (!(await form.trigger())) {
        if (hasOptionError(form.formState.errors)) setOptionsOpen(true);
        return;
      }
      all = withFormLine(lines, {
        id: formLineIdRef.current,
        values: form.getValues(),
        added: false,
      });
    }
    setFormErrors([]);
    // With some lines added, the draft records their charges and group, so
    // adding it later finishes the same invoice rather than starting one.
    const partial = all.some((line) => line.added);
    try {
      await saveDraft.mutateAsync({
        spec: buildChargeDraftSpec(
          all.map((line) => line.values),
          current.invoice,
          accountName
        ),
        draft: draftRef.current,
        annotations: partial
          ? chargeDraftSendAnnotations({
              names: all.map(nameFor),
              group: chargeInvoiceGroup(current.invoice, all.length, groupNameRef.current ?? ''),
            })
          : { [CHARGE_DRAFT_SEND_ANNOTATION]: undefined },
      });
      toast.success(
        partial
          ? t`The rest are saved with the added lines as a draft. Add it from the charges card to finish the invoice.`
          : draftRef.current
            ? t`Draft saved.`
            : t`Saved as a draft. It's on the charges card to check, preview and add.`
      );
      onClose();
    } catch (err) {
      setFormErrors(chargeDraftServerErrors(err));
    }
  };

  return (
    <Form.Root
      schema={schema}
      defaultValues={{ ...emptyChargeFormValues(), invoice: initialInvoice }}
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col">
      {({ isSubmitting }) => {
        const busy = isSubmitting || createCharge.isPending;
        return (
          <>
            <ShowSubmitErrors />
            <FormBridge formRef={formRef} onOptionErrors={() => setOptionsOpen(true)} />
            <Dialog.Body
              className={cn('flex flex-col gap-4 px-5 pt-0', (confirming || leaving) && 'hidden')}>
              <KeptLines
                lines={lines}
                formAt={formAt}
                currentPeriod={currentPeriod}
                locked={locked}
                onEdit={(id) => void editLine(id)}
                onRemove={(id) => {
                  const index = lines.findIndex((line) => line.id === id);
                  if (formAt !== null && index >= 0 && index < formAt) setFormAt(formAt - 1);
                  setLines((kept) => kept.filter((line) => line.id !== id));
                }}
              />
              {catalogFailed ? (
                <Text size="sm" textColor="muted">
                  <Trans>Couldn&apos;t load the catalog. You can still add a custom item.</Trans>
                </Text>
              ) : null}
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-start gap-3">
                <Form.Field name="item" label={t`Item`} required>
                  <ChargeItemPicker
                    options={options}
                    accountPricesLabel={t`${accountDisplayName}'s contract prices`}
                    onCatalogTax={() => setOptionsOpen(true)}
                  />
                </Form.Field>
                <Form.Field name="quantity" label={t`Qty`} required>
                  <Form.Input inputMode="decimal" placeholder="1" />
                </Form.Field>
              </div>
              <PickedItemInfo options={options} />
              <Form.Field
                name="description"
                label={t`Description`}
                description={t`What the invoice calls the line. Never put the SKU here.`}
                required>
                <Form.Input placeholder={t`Cross-connect install, cage 12`} />
              </Form.Field>
              <PriceField options={options} />

              <ChargeItemOptions
                open={optionsOpen}
                onToggle={() => setOptionsOpen((open) => !open)}
                account={account}
                now={now}
                currentPeriod={currentPeriod}
              />

              <Form.Field
                name="invoice"
                label={t`When`}
                description={
                  lines.length > 0
                    ? t`For every line. Invoiced now, they go out together on one invoice.`
                    : undefined
                }>
                <Form.RadioGroup orientation="horizontal" disabled={locked}>
                  <TimingOption value="NextInvoice" label={t`On the next invoice`} />
                  <TimingOption value="Now" label={t`Invoice now`} />
                </Form.RadioGroup>
              </Form.Field>

              <ChargeInvoiceLine currentPeriod={currentPeriod} />

              {locked ? null : (
                <div>
                  <Button
                    type="secondary"
                    theme="outline"
                    size="small"
                    htmlType="button"
                    icon={<Icon icon={Plus} size={14} />}
                    disabled={busy || lines.length + 1 >= MAX_CHARGE_LINES}
                    onClick={() => void addAnotherLine()}>
                    <Trans>Add another line</Trans>
                  </Button>
                </div>
              )}

              <FormErrors errors={formErrors} />
            </Dialog.Body>

            {leaving ? (
              <Dialog.Body className="flex flex-col gap-3 px-5 pt-0">
                <LeavingWarning
                  added={lines.filter((line) => line.added).length}
                  pending={
                    lines.filter((line) => !line.added).length +
                    (formRef.current && !isEmptyChargeForm(formRef.current.getValues()) ? 1 : 0)
                  }
                  grouped={formRef.current?.getValues('invoice') === 'Now'}
                  canSaveDraft={canSaveDraft}
                />
                <FormErrors errors={formErrors} />
              </Dialog.Body>
            ) : null}

            {confirming ? (
              <Dialog.Body className="flex flex-col gap-3 px-5 pt-0">
                <InvoiceNowConfirmation
                  orgName={orgName}
                  account={account}
                  lines={confirming.lines}
                  currentPeriod={currentPeriod}
                />
                <FormErrors errors={formErrors} />
              </Dialog.Body>
            ) : null}

            <Dialog.Footer className="gap-2">
              {leaving ? (
                <>
                  <Button
                    type="quaternary"
                    theme="borderless"
                    htmlType="button"
                    disabled={saveDraft.isPending}
                    onClick={() => setLeaving(false)}>
                    <Trans>Back</Trans>
                  </Button>
                  <Button
                    type="danger"
                    theme="outline"
                    htmlType="button"
                    disabled={saveDraft.isPending}
                    onClick={onClose}>
                    <Trans>Close anyway</Trans>
                  </Button>
                  {canSaveDraft ? (
                    <Button
                      htmlType="button"
                      loading={saveDraft.isPending}
                      disabled={saveDraft.isPending}
                      onClick={() => void saveAsDraft()}>
                      <Trans>Save the rest as a draft</Trans>
                    </Button>
                  ) : null}
                </>
              ) : confirming ? (
                <>
                  <Button
                    type="quaternary"
                    theme="borderless"
                    htmlType="button"
                    disabled={busy}
                    onClick={() => setConfirming(null)}>
                    <Trans>Back</Trans>
                  </Button>
                  <Button
                    htmlType="button"
                    loading={createCharge.isPending}
                    disabled={busy}
                    onClick={() => void create(confirming)}>
                    <Trans>Invoice now</Trans>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="quaternary"
                    theme="borderless"
                    htmlType="button"
                    disabled={busy}
                    onClick={requestClose}>
                    <Trans>Cancel</Trans>
                  </Button>
                  {canSaveDraft ? (
                    <Button
                      type="secondary"
                      theme="outline"
                      htmlType="button"
                      loading={saveDraft.isPending}
                      disabled={busy || saveDraft.isPending}
                      onClick={() => void saveAsDraft()}>
                      {draftRef.current ? (
                        <Trans>Save draft</Trans>
                      ) : locked ? (
                        <Trans>Save the rest as a draft</Trans>
                      ) : (
                        <Trans>Save as draft</Trans>
                      )}
                    </Button>
                  ) : null}
                  <SubmitButton
                    keptLines={lines.length}
                    locked={locked}
                    busy={busy}
                    onSendKept={sendKeptLines}
                  />
                </>
              )}
            </Dialog.Footer>
          </>
        );
      }}
    </Form.Root>
  );
}

/**
 * Keeps a handle on the form, for placing billing's refusals on their
 * fields after a create fails, and opens the item options when a submit
 * finds an error in one of them.
 */
function FormBridge({
  formRef,
  onOptionErrors,
}: {
  formRef: { current: UseFormReturn<ChargeFormValues> | null };
  onOptionErrors: () => void;
}) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const { submitCount, errors } = form.formState;
  useEffect(() => {
    formRef.current = form;
  }, [form, formRef]);
  // Once per submit, so staff can still close the options afterwards.
  const handledSubmits = useRef(0);
  useEffect(() => {
    if (submitCount <= handledSubmits.current) return;
    handledSubmits.current = submitCount;
    if (hasOptionError(errors)) onOptionErrors();
  }, [submitCount, errors, onOptionErrors]);
  return null;
}

const hasOptionError = (errors: FieldErrors<ChargeFormValues>) =>
  OPTION_FIELDS.some((field) => Boolean(errors[field]));

/**
 * What closing loses, when some lines are added and the rest are only in
 * the dialog.
 */
function LeavingWarning({
  added,
  pending,
  grouped,
  canSaveDraft,
}: {
  added: number;
  pending: number;
  grouped: boolean;
  canSaveDraft: boolean;
}) {
  return (
    <Alert variant="warning">
      <AlertDescription className="flex flex-col gap-2">
        <Text size="sm" weight="medium">
          <Trans>
            {added} added, {pending} not added yet
          </Trans>
        </Text>
        <Text size="sm">
          {grouped ? (
            <Trans>
              The added charges wait for the rest: their invoice goes out once every line is added.
              Closing loses the lines not added yet.
            </Trans>
          ) : (
            <Trans>Closing loses the lines not added yet.</Trans>
          )}{' '}
          {canSaveDraft ? (
            <Trans>Save them as a draft to add later.</Trans>
          ) : grouped ? (
            <Trans>If you close, remove the added charges from the charges card.</Trans>
          ) : null}
        </Text>
      </AlertDescription>
    </Alert>
  );
}

function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}

/** The most lines one dialog adds: billing's largest invoice group. */
const MAX_CHARGE_LINES = 50;

const successMessage = (lines: number, invoice: ChargeInvoiceTiming): string => {
  if (lines === 1) {
    return invoice === 'Now'
      ? t`Charge added. It's invoiced on its own now.`
      : t`Charge added. It goes on the account's next invoice.`;
  }
  return invoice === 'Now'
    ? t`${lines} charges added. They're invoiced together now.`
    : t`${lines} charges added. They go on the account's next invoice.`;
};

/**
 * Adds the charges: the kept lines and the one in the form. With lines
 * kept and the form left empty, it sends the kept lines alone, unless some
 * are added already: then the line in the form is one the group waits for.
 */
function SubmitButton({
  keptLines,
  locked,
  busy,
  onSendKept,
}: {
  keptLines: number;
  locked: boolean;
  busy: boolean;
  onSendKept: () => Promise<void>;
}) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const values = useWatch({ control: form.control }) as ChargeFormValues;
  const keptOnly = keptLines > 0 && !locked && isEmptyChargeForm(values);
  const count = keptOnly ? keptLines : keptLines + 1;
  const label = count === 1 ? t`Add charge` : t`Add ${count} charges`;
  if (keptOnly) {
    return (
      <Button htmlType="button" loading={busy} disabled={busy} onClick={() => void onSendKept()}>
        {label}
      </Button>
    );
  }
  return (
    <Button htmlType="submit" loading={busy} disabled={busy}>
      {label}
    </Button>
  );
}

/**
 * The lines kept so far, as the invoice will show them, each removable
 * until one of them is added.
 */
function KeptLines({
  lines,
  formAt,
  currentPeriod,
  locked,
  onEdit,
  onRemove,
}: {
  lines: ChargeLine[];
  /** Where the line in the form sits among them, when it's a kept one being changed. */
  formAt: number | null;
  currentPeriod: ServicePeriod;
  locked: boolean;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, index) => {
        // Numbered as on the invoice, counting the line in the form.
        const number = formAt !== null && index >= formAt ? index + 2 : index + 1;
        return (
          <div key={line.id} className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <ChargeLineSummary
                label={line.added ? t`Line ${number} · added` : t`Line ${number}`}
                summary={chargeSummary(line.values, currentPeriod)}
              />
            </div>
            {locked ? null : (
              <>
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  htmlType="button"
                  className="mt-1"
                  aria-label={t`Change line ${number}`}
                  icon={<Icon icon={ACTION_ICONS.edit} size={14} />}
                  onClick={() => onEdit(line.id)}
                />
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  htmlType="button"
                  className="mt-1"
                  aria-label={t`Remove line ${number}`}
                  icon={<Icon icon={ACTION_ICONS.close} size={14} />}
                  onClick={() => onRemove(line.id)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The price per unit: a catalog item's, which staff can change, with the
 * list price and a reset beside it when they have. A custom item's is
 * required.
 */
function PriceField({ options }: { options: ReturnType<typeof chargeItemOptions> }) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const item = (Form.useWatch('item') as string | undefined) ?? '';
  const unitAmount = (Form.useWatch('unitAmount') as string | undefined) ?? '';
  const pricingName = catalogPricingName(item);
  const fee = pricingName
    ? [...options.accountPrices, ...options.catalog].find((option) => option.name === pricingName)
    : undefined;
  const listCents = fee ? parseHundredths(fee.amount) : null;
  const changed = fee !== undefined && parseHundredths(unitAmount) !== listCents;
  const unit = fee?.pricingUnit || t`unit`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <Form.Field name="unitAmount" label={t`Price (US$)`} required className="w-40">
          <Form.Input inputMode="decimal" placeholder="250.00" />
        </Form.Field>
        <Text size="sm" textColor="muted" className="pb-2">
          <Trans>per {unit}</Trans>
        </Text>
        {changed ? (
          <Text size="sm" textColor="muted" className="ml-auto pb-2">
            <Trans>
              List price {listCents === null ? `${fee.amount} USD` : formatChargeMoney(listCents)}
            </Trans>{' '}
            ·{' '}
            <button
              type="button"
              className="text-foreground underline underline-offset-2"
              onClick={() =>
                form.setValue('unitAmount', pricingUnitAmount(fee.amount), {
                  shouldDirty: true,
                  shouldValidate: form.formState.isSubmitted,
                })
              }>
              <Trans>Reset</Trans>
            </button>
          </Text>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Tax, discount, supply date and the staff note, collapsed by default as in
 * Stripe's editor.
 */
function ChargeItemOptions({
  open,
  onToggle,
  account,
  now,
  currentPeriod,
}: {
  open: boolean;
  onToggle: () => void;
  account: BillingAccount;
  now: Date;
  currentPeriod: ServicePeriod;
}) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const notTaxable = Boolean(Form.useWatch('notTaxable'));
  const periodEnd = (Form.useWatch('periodEnd') as string | undefined) ?? '';
  const nextPeriod = useMemo(() => nextBillingPeriod(account, now), [account, now]);
  const today = isoDay(startOfUtcDay(now));
  const set = <K extends keyof ChargeFormValues>(name: K, value: ChargeFormValues[K]) =>
    form.setValue(name, value as never, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  const setDates = (period: ServicePeriod) => {
    set('periodStart', period.start);
    set('periodEnd', period.end);
  };

  return (
    <ItemOptions open={open} onToggle={onToggle}>
      <div className="flex flex-col gap-1.5">
        <Form.Field
          name="taxCode"
          label={t`Tax code`}
          description={t`One of Stripe's tax codes, such as txcd_20030000. Leave it empty for the account's default.`}>
          <Form.Input placeholder="txcd_20030000" disabled={notTaxable} />
        </Form.Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={notTaxable}
            onCheckedChange={(checked) => {
              set('notTaxable', checked === true);
              if (checked === true) set('taxCode', '');
            }}
          />
          <Trans>Not taxable</Trans>
        </label>
      </div>

      <Form.Field name="discountPercent" label={t`Discount (%)`} className="w-40">
        <Form.Input inputMode="decimal" placeholder={t`None`} />
      </Form.Field>

      <SupplyDateField
        defaultPeriod={() => currentPeriod}
        unsetHint={<Trans>The current billing period, {formatServicePeriod(currentPeriod)}.</Trans>}
        tooltip={t`The dates shown on the invoice line. Unticked, it's the current billing period. Tick to show when the work was done, such as an install date. This doesn't change when it's billed.`}>
        <Text as="p" size="sm" className="flex flex-wrap items-center gap-x-1">
          <Shortcut onClick={() => setDates(currentPeriod)}>
            <Trans>This billing period</Trans>
          </Shortcut>
          <span aria-hidden>·</span>
          <Shortcut onClick={() => setDates(nextPeriod)}>
            <Trans>Next billing period</Trans>
          </Shortcut>
          <span aria-hidden>·</span>
          <Shortcut onClick={() => setDates({ start: today, end: today })}>
            <Trans>Today</Trans>
          </Shortcut>
        </Text>
        {isBeforePeriod(periodEnd, currentPeriod) ? (
          <Text size="sm" className="text-warning flex items-center gap-1.5">
            <Icon icon={TriangleAlert} size={14} />
            <Trans>These dates are before the current billing period.</Trans>
          </Text>
        ) : null}
      </SupplyDateField>

      <Form.Field
        name="note"
        label={t`Note for staff`}
        description={
          notTaxable
            ? t`Required: say why it isn't taxable. Never shown to the customer.`
            : t`Never shown to the customer. Up to ${MAX_CHARGE_NOTE} characters.`
        }
        required={notTaxable}>
        <Form.Textarea rows={2} placeholder={t`Installed for the new cage; ticket OPS-1234`} />
      </Form.Field>
    </ItemOptions>
  );
}

function Shortcut({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="underline underline-offset-2" onClick={onClick}>
      {children}
    </button>
  );
}

/** The line as the customer will read it on the invoice. */
function ChargeInvoiceLine({ currentPeriod }: { currentPeriod: ServicePeriod }) {
  const form = Form.useFormContext().form.raw as UseFormReturn<ChargeFormValues>;
  const values = useWatch({ control: form.control }) as ChargeFormValues;
  return <ChargeLineSummary summary={chargeSummary(values, currentPeriod)} />;
}

/** The invoice line: description, quantity and price, amount and dates. */
export function ChargeLineSummary({
  summary,
  label,
}: {
  summary: ReturnType<typeof chargeSummary>;
  /** What the line is; "On the invoice" when left out. */
  label?: string;
}) {
  return (
    <div className="bg-background flex flex-col gap-1 rounded-md px-3 py-2">
      <Text size="xs" textColor="muted">
        {label ?? <Trans>On the invoice</Trans>}
      </Text>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Text size="sm" weight="medium" className="break-words">
            {summary.description || '—'}
          </Text>
          {summary.line ? (
            <Text size="sm" textColor="muted">
              {summary.line}
            </Text>
          ) : null}
          <Text size="xs" textColor="muted">
            <Trans>{summary.dates} · Tax is worked out by Stripe on the invoice</Trans>
          </Text>
        </div>
        <Text size="sm" weight="medium" className="shrink-0 tabular-nums">
          {summary.amount || '—'}
        </Text>
      </div>
    </div>
  );
}

/**
 * One choice of when the charge is invoiced. Form.RadioItem top-aligns the
 * radio and nudges it down by a fixed margin, which leaves it below the
 * middle of a one-line label; this centres the two instead.
 */
function TimingOption({ value, label }: { value: string; label: string }) {
  const id = `charge-invoice-${value}`;
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}

/**
 * Invoice now's second step: the lines, their total before tax, and what
 * happens next.
 */
function InvoiceNowConfirmation({
  orgName,
  account,
  lines,
  currentPeriod,
}: {
  orgName: string;
  account: BillingAccount;
  lines: ChargeLine[];
  currentPeriod: ServicePeriod;
}) {
  const { paymentMethods } = useAccountPaymentMethods(orgName, account);
  const amountDue = lines.reduce((total, { values }) => {
    const amounts = chargeAmounts(values.quantity, values.unitAmount, values.discountPercent);
    return total + (amounts.ok ? amounts.amountDue : 0n);
  }, 0n);
  const single = lines.length === 1;
  return (
    <div className="flex flex-col gap-3">
      <Text size="sm" weight="medium">
        {single ? (
          <Trans>Invoice this charge now?</Trans>
        ) : (
          <Trans>Invoice these {lines.length} charges now?</Trans>
        )}
      </Text>
      {lines.map((line, index) => (
        <ChargeLineSummary
          key={line.id}
          label={single ? undefined : t`Line ${index + 1}`}
          summary={chargeSummary(line.values, currentPeriod)}
        />
      ))}
      <Text size="sm">
        {single ? (
          <Trans>
            It goes on an invoice of its own, for {formatChargeMoney(amountDue)} before tax, sent as
            soon as the billing provider has it.
          </Trans>
        ) : (
          <Trans>
            They go together on an invoice of their own, for {formatChargeMoney(amountDue)} before
            tax, sent as soon as the billing provider has all of them.
          </Trans>
        )}{' '}
        {invoiceNowOutcome(account, amountDue, paymentMethods)}
      </Text>
    </div>
  );
}

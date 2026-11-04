import { DialogForm } from '@/components/dialog';
import { useContactGroupSearch } from '@/hooks';
import {
  contactQueryKeys,
  useContactGroupMembershipListQuery,
  useCreateContactGroupMembershipMutation,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import z from 'zod';

type Props = {
  contactName: string;
  contactNamespace?: string;
  /** Trigger styling: bordered in the page header, borderless in a card header. */
  variant?: 'header' | 'card';
};

/**
 * Add a contact to a group (#761) from the overview, reusing the group-picker
 * dialog the Contact groups tab uses. The picker excludes groups the contact is
 * already in. The create mutation invalidates the membership query, so the card
 * and the timeline refresh without a reload.
 */
export function AddToGroupDialog({
  contactName,
  contactNamespace = 'default',
  variant = 'card',
}: Props) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const AddIcon = ACTION_ICONS.add;

  const membershipQuery = useContactGroupMembershipListQuery(contactName);
  const joined = useMemo(() => membershipQuery.data?.items ?? [], [membershipQuery.data?.items]);
  const createMembership = useCreateContactGroupMembershipMutation();
  const { options, isLoading, setSearch } = useContactGroupSearch();

  // Option values are `name|namespace`; drop the groups the contact already has.
  const availableOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          !joined.some((item) => {
            const key = [
              item.contactGroup?.metadata?.name ?? '',
              item.contactGroup?.metadata?.namespace ?? 'default',
            ].join('|');
            return key === option.value;
          })
      ),
    [options, joined]
  );

  const schema = z.object({ name: z.string().nonempty(t`Contact group is required`) });

  const handleAdd = async (formData: z.infer<typeof schema>) => {
    const [name, namespace] = formData.name.split('|');
    await createMembership.mutateAsync({
      namespace: 'default',
      payload: {
        contactGroupRef: { name, namespace },
        contactRef: { name: contactName, namespace: contactNamespace },
      },
    });
    // The shared hook only invalidates the contact-group keys; the overview card
    // and timeline read the contact's membership list, so refresh that too.
    await queryClient.invalidateQueries({ queryKey: contactQueryKeys.groups.all(contactName) });
    toast.success(t`Contact group added successfully`);
  };

  return (
    <>
      <Button
        type={variant === 'header' ? 'secondary' : 'quaternary'}
        theme={variant === 'header' ? 'outline' : 'borderless'}
        size={variant === 'header' ? undefined : 'xs'}
        icon={<AddIcon size={variant === 'header' ? 16 : 14} />}
        onClick={() => setOpen(true)}>
        <Trans>Add to group</Trans>
      </Button>

      <DialogForm
        open={open}
        onOpenChange={setOpen}
        title={t`Add to Contact Group`}
        submitText={t`Add`}
        cancelText={t`Cancel`}
        onSubmit={handleAdd}
        schema={schema}
        defaultValues={{ name: '' }}>
        <Form.Field name="name">
          <Form.Autocomplete
            modal
            placeholder={t`Select contact group...`}
            searchPlaceholder={t`Search contact groups...`}
            options={availableOptions}
            loading={isLoading}
            onSearchChange={(query) => setSearch(query)}
          />
        </Form.Field>
      </DialogForm>
    </>
  );
}

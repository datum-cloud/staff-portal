import { DialogForm } from '@/components/dialog';
import {
  GROUP_DESCRIPTION_ANNOTATION,
  GROUP_DISPLAY_NAME_ANNOTATION,
  STAFF_GROUP_NAMESPACE,
  useCreateGroupMutation,
  useUpdateGroupMutation,
} from '@/resources/request/client';
import { groupRoutes } from '@/utils/config/routes.config';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import type { ComMiloapisIamV1Alpha1Group } from '@openapi/iam.miloapis.com/v1alpha1';
import { useNavigate, useRevalidator } from 'react-router';
import z from 'zod';

/** A Kubernetes resource name: lowercase letters, digits and hyphens, at most 63 characters. */
const GROUP_ID = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

/** Display name and description, shared by the create and edit dialogs. */
function GroupDetailsFields() {
  const { t } = useLingui();
  return (
    <>
      <Form.Field name="displayName" label={t`Display name`} required>
        <Form.Input placeholder={t`e.g. Finance`} />
      </Form.Field>
      <Form.Field name="description" label={t`Description`}>
        <Form.Textarea rows={3} placeholder={t`What this group is for`} />
      </Form.Field>
    </>
  );
}

/** Creates a staff group in milo-system, then opens it. */
export function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const createGroup = useCreateGroupMutation();

  const schema = z.object({
    name: z
      .string()
      .trim()
      .nonempty(t`ID is required`)
      .max(63, t`ID must be 63 characters or fewer`)
      .regex(
        GROUP_ID,
        t`Use lowercase letters, numbers and hyphens, starting and ending with a letter or number`
      ),
    displayName: z
      .string()
      .trim()
      .nonempty(t`Display name is required`),
    description: z.string().optional(),
  });

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title={t`Add Group`}
      description={t`Creates a staff group in ${STAFF_GROUP_NAMESPACE}.`}
      submitText={t`Create`}
      cancelText={t`Cancel`}
      schema={schema}
      defaultValues={{ name: '', displayName: '', description: '' }}
      onSubmit={async (formData: z.infer<typeof schema>) => {
        await createGroup.mutateAsync({
          name: formData.name,
          details: { displayName: formData.displayName, description: formData.description },
        });
        toast.success(t`Group created`);
        navigate(groupRoutes.detail(STAFF_GROUP_NAMESPACE, formData.name));
      }}>
      <>
        <Form.Field
          name="name"
          label={t`ID`}
          description={t`Can't be changed later. Lowercase letters, numbers and hyphens.`}
          required>
          <Form.Input placeholder={t`e.g. finance`} />
        </Form.Field>
        <GroupDetailsFields />
      </>
    </DialogForm>
  );
}

/** Edits a group's display name and description. */
export function EditGroupDialog({
  group,
  open,
  onOpenChange,
}: {
  group: ComMiloapisIamV1Alpha1Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLingui();
  const updateGroup = useUpdateGroupMutation();
  // The group page reads the group from its route loader, so reload it after saving.
  const revalidator = useRevalidator();
  const annotations = group.metadata?.annotations ?? {};

  const schema = z.object({
    displayName: z
      .string()
      .trim()
      .nonempty(t`Display name is required`),
    description: z.string().optional(),
  });

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title={t`Edit Group`}
      submitText={t`Save`}
      cancelText={t`Cancel`}
      schema={schema}
      defaultValues={{
        displayName: annotations[GROUP_DISPLAY_NAME_ANNOTATION] ?? group.metadata?.name ?? '',
        description: annotations[GROUP_DESCRIPTION_ANNOTATION] ?? '',
      }}
      onSubmit={async (formData: z.infer<typeof schema>) => {
        await updateGroup.mutateAsync({
          metadata: group.metadata,
          details: { displayName: formData.displayName, description: formData.description },
        });
        await revalidator.revalidate();
        toast.success(t`Group updated`);
      }}>
      <GroupDetailsFields />
    </DialogForm>
  );
}

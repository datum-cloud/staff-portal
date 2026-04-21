import { contactGroupCreateMutation, contactGroupUpdateMutation } from '@/resources/request/client';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisNotificationV1Alpha1ContactGroup } from '@openapi/notification.miloapis.com/v1alpha1';
import * as React from 'react';
import { useNavigate } from 'react-router';
import z from 'zod';

interface Props {
  contactGroup?: ComMiloapisNotificationV1Alpha1ContactGroup;
}

export const ContactGroupForm: React.FC<Props> = ({ contactGroup }) => {
  const navigate = useNavigate();
  const { t } = useLingui();

  const contactGroupSchema = z.object({
    display_name: z.string().nonempty(t`Display name is required`),
    visibility: z.enum(['public', 'private']).optional(),
    provider_id: z.string().optional(),
    description: z.string().optional(),
  });

  const onSubmit = async (value: z.infer<typeof contactGroupSchema>) => {
    const baseSpec: ComMiloapisNotificationV1Alpha1ContactGroup['spec'] = {
      displayName: value.display_name,
      visibility: value.visibility || 'public',
      ...(value.description !== undefined && { description: value.description }),
    };

    if (contactGroup) {
      await contactGroupUpdateMutation(contactGroup.metadata, baseSpec);
      toast.success(t`Contact group updated successfully`);
    } else {
      const spec: ComMiloapisNotificationV1Alpha1ContactGroup['spec'] = {
        ...baseSpec,
        ...(value.provider_id?.trim() && {
          providers: [{ id: value.provider_id.trim(), name: 'Loops' }],
        }),
      };
      const data = await contactGroupCreateMutation('default', spec);
      navigate(contactGroupRoutes.detail(data.metadata?.name ?? ''));
      toast.success(t`Contact group created successfully`);
    }
  };

  return (
    <Form.Root
      className="space-y-4"
      schema={contactGroupSchema}
      defaultValues={{
        display_name: contactGroup?.spec?.displayName ?? '',
        visibility: contactGroup?.spec?.visibility ?? 'public',
        provider_id: contactGroup?.spec?.providers?.find((p) => p.name === 'Loops')?.id ?? '',
        description: contactGroup?.spec?.description ?? '',
      }}
      onSubmit={onSubmit}>
      {({ isSubmitting, isDirty, isValid }) => (
        <>
          <Form.Field name="display_name" label={t`Display Name`} required>
            <Form.Input />
          </Form.Field>

          <Form.Field
            name="provider_id"
            label={t`Provider ID`}
            description={
              contactGroup
                ? t`Provider ID cannot be changed after the contact group is created.`
                : undefined
            }>
            <Form.Input disabled={!!contactGroup} />
          </Form.Field>

          <Form.Field
            name="description"
            label={t`Description`}
            description={t`Manually sync this description with the one in Loops (used for opt-in pages).`}>
            <Form.Textarea />
          </Form.Field>

          <Form.Field name="visibility" label={t`Visibility`}>
            <Form.Select placeholder={t`Select visibility...`}>
              <Form.SelectItem value="public">{t`Public`}</Form.SelectItem>
              <Form.SelectItem value="private">{t`Private`}</Form.SelectItem>
            </Form.Select>
          </Form.Field>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="tertiary"
              theme="borderless"
              onClick={() => navigate(contactGroupRoutes.list())}>
              {t`Cancel`}
            </Button>
            <Button
              htmlType="submit"
              disabled={!isDirty || !isValid || isSubmitting}
              loading={isSubmitting}>
              {contactGroup ? t`Update` : t`Create`}
            </Button>
          </div>
        </>
      )}
    </Form.Root>
  );
};

import { contactGroupCreateMutation, contactGroupUpdateMutation } from '@/resources/request/client';
import { ContactGroup, ContactGroupCreate } from '@/resources/schemas';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { generateMetadataName } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import * as React from 'react';
import { useNavigate } from 'react-router';
import z from 'zod';

interface Props {
  contactGroup?: ContactGroup;
}

export const ContactGroupForm: React.FC<Props> = ({ contactGroup }) => {
  const navigate = useNavigate();
  const { t } = useLingui();

  const contactGroupSchema = z.object({
    display_name: z.string().nonempty(t`Display name is required`),
    visibility: z.enum(['public', 'private']).optional(),
  });

  const onSubmit = async (value: z.infer<typeof contactGroupSchema>) => {
    const spec: ContactGroupCreate['spec'] = {
      displayName: value.display_name,
      visibility: value.visibility || 'public',
    };

    if (contactGroup) {
      await contactGroupUpdateMutation(contactGroup.metadata.name, { spec });
      toast.success(t`Contact group updated successfully`);
    } else {
      await contactGroupCreateMutation({
        apiVersion: 'notification.miloapis.com/v1alpha1',
        kind: 'ContactGroup',
        spec,
        metadata: {
          name: generateMetadataName(
            [value.display_name, 'contact-group'].filter(Boolean).join('-')
          ),
          namespace: 'default',
        },
      });
      navigate(contactGroupRoutes.list());
      toast.success(t`Contact group created successfully`);
    }
  };

  return (
    <Form
      className="space-y-4"
      schema={contactGroupSchema}
      defaultValues={{
        display_name: contactGroup?.spec?.displayName ?? '',
        visibility: contactGroup?.spec?.visibility ?? 'public',
      }}
      onSubmit={onSubmit}>
      {(form) => (
        <>
          <Form.Input field="display_name" label={t`Display Name`} required />

          <Form.Select
            field="visibility"
            label={t`Visibility`}
            placeholder={t`Select visibility...`}
            options={[
              { value: 'public', label: t`Public` },
              { value: 'private', label: t`Private` },
            ]}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="tertiary"
              theme="borderless"
              onClick={() => navigate(contactGroupRoutes.list())}>
              {t`Cancel`}
            </Button>
            <Button
              htmlType="submit"
              disabled={!form.formState.isDirty}
              loading={form.formState.isSubmitting}>
              {contactGroup ? t`Update` : t`Create`}
            </Button>
          </div>
        </>
      )}
    </Form>
  );
};

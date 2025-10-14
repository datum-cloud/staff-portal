import { useOrganizationSearch, useProjectSearch, useUserSearch } from '@/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/modules/shadcn/ui/tabs';
import { contactCreateMutation, contactUpdateMutation } from '@/resources/request/client';
import { Contact, ContactCreate } from '@/resources/schemas';
import { contactRoutes } from '@/utils/config/routes.config';
import { generateMetadataName } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { Text } from '@datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { Building2, FolderOpen, User } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router';
import z from 'zod';

interface Props {
  contact?: Contact;
}

export const ContactForm: React.FC<Props> = ({ contact }) => {
  const navigate = useNavigate();
  const { t } = useLingui();
  const [associationType, setAssociationType] = React.useState<string>(
    contact?.spec?.subject?.kind || 'User'
  );

  // Search hooks for each type
  const {
    options: userOptions,
    isLoading: usersLoading,
    setSearch: setUserSearch,
  } = useUserSearch();
  const {
    options: orgOptions,
    isLoading: orgsLoading,
    setSearch: setOrgSearch,
  } = useOrganizationSearch();
  const {
    options: projectOptions,
    isLoading: projectsLoading,
    setSearch: setProjectSearch,
  } = useProjectSearch();

  const contactSchema = z.object({
    first_name: z.string().nonempty(t`First name is required`),
    last_name: z.string().nonempty(t`Last name is required`),
    email: z.email(t`Invalid email address`),
    subject: z.string().nonempty(t`Subject is required`),
  });

  const onSubmit = async (value: z.infer<typeof contactSchema>) => {
    const spec: ContactCreate['spec'] = {
      familyName: value.last_name,
      givenName: value.first_name,
      email: value.email,
      subject: {
        apiGroup: associationType === 'User' ? 'iam.miloapis.com' : 'resourcemanager.miloapis.com',
        kind: associationType as 'User' | 'Organization' | 'Project',
        name: value.subject,
        namespace:
          associationType === 'User'
            ? ''
            : associationType === 'Organization'
              ? `organization-${value.subject}`
              : `project-${value.subject}`,
      },
    };

    if (contact) {
      await contactUpdateMutation(contact.metadata.name, { spec });
      toast.success(t`Contact updated successfully`);
    } else {
      await contactCreateMutation({
        apiVersion: 'notification.miloapis.com/v1alpha1',
        kind: 'Contact',
        spec,
        metadata: {
          name: generateMetadataName(
            [value.first_name, value.last_name, 'contact'].filter(Boolean).join('-')
          ),
          namespace: 'default',
        },
      });
      navigate(contactRoutes.list());
      toast.success(t`Contact created successfully`);
    }
  };

  return (
    <Form
      className="space-y-4"
      schema={contactSchema}
      defaultValues={{
        first_name: contact?.spec?.givenName ?? '',
        last_name: contact?.spec?.familyName ?? '',
        email: contact?.spec?.email ?? '',
        subject: contact?.spec?.subject?.name || '',
      }}
      onSubmit={onSubmit}>
      {(form) => (
        <>
          <Form.Input field="first_name" label={t`First Name`} required />
          <Form.Input field="last_name" label={t`Last Name`} required />
          <Form.Input field="email" label={t`Email`} required />

          <div className="space-y-2">
            <Tabs
              value={associationType || 'User'}
              onValueChange={setAssociationType}
              className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="User" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t`User`}
                </TabsTrigger>
                <TabsTrigger value="Organization" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t`Organization`}
                </TabsTrigger>
                <TabsTrigger value="Project" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {t`Project`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="User" className="mt-4">
                <div className="w-1/2">
                  <Form.Autocomplete
                    field="subject"
                    placeholder={usersLoading ? t`Loading users...` : t`Select a user...`}
                    searchPlaceholder={t`Search users...`}
                    options={userOptions}
                    isLoading={usersLoading}
                    onSearch={setUserSearch}
                    searchDebounceMs={300}
                    disabled={usersLoading}
                  />
                </div>
              </TabsContent>

              <TabsContent value="Organization" className="mt-4">
                <div className="w-1/2">
                  <Form.Autocomplete
                    field="subject"
                    placeholder={
                      orgsLoading ? t`Loading organizations...` : t`Select an organization...`
                    }
                    searchPlaceholder={t`Search organizations...`}
                    options={orgOptions}
                    isLoading={orgsLoading}
                    onSearch={setOrgSearch}
                    searchDebounceMs={300}
                    disabled={orgsLoading}
                  />
                </div>
              </TabsContent>

              <TabsContent value="Project" className="mt-4">
                <div className="w-1/2">
                  <Form.Autocomplete
                    field="subject"
                    placeholder={projectsLoading ? t`Loading projects...` : t`Select a project...`}
                    searchPlaceholder={t`Search projects...`}
                    options={projectOptions}
                    isLoading={projectsLoading}
                    onSearch={setProjectSearch}
                    searchDebounceMs={300}
                    disabled={projectsLoading}
                  />
                </div>
              </TabsContent>
            </Tabs>
            <Text size="xs" textColor="muted">
              {t`Associate this contact with a user, organization, or project`}
            </Text>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="tertiary"
              theme="borderless"
              onClick={() => navigate(contactRoutes.list())}>
              {t`Cancel`}
            </Button>
            <Button
              htmlType="submit"
              disabled={!form.formState.isDirty}
              loading={form.formState.isSubmitting}>
              {contact ? t`Update` : t`Create`}
            </Button>
          </div>
        </>
      )}
    </Form>
  );
};

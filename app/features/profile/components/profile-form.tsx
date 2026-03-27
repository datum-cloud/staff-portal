import { useApp } from '@/providers/app.provider';
import { userUpdateMutation } from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Form } from '@datum-ui/form';
import { Trans, useLingui } from '@lingui/react/macro';
import z from 'zod';

export function ProfileForm() {
  const { user, setUser } = useApp();
  const { t } = useLingui();

  const userSchema = z.object({
    first_name: z.string().nonempty(t`First name is required`),
    last_name: z.string().nonempty(t`Last name is required`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Profile Information</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form
          className="space-y-4"
          schema={userSchema}
          defaultValues={{
            first_name: user?.spec?.givenName ?? '',
            last_name: user?.spec?.familyName ?? '',
          }}
          onSubmit={async (value: z.infer<typeof userSchema>) => {
            const updatedUser = await userUpdateMutation(user?.metadata?.name || '', {
              familyName: value.last_name,
              givenName: value.first_name,
            });

            // update user in store
            setUser(updatedUser);
            toast.success(t`Profile updated successfully`);
          }}>
          {(form) => (
            <>
              <Form.Input field="first_name" label="First Name" required />
              <Form.Input field="last_name" label="Last Name" required />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  htmlType="submit"
                  disabled={!form.formState.isDirty}
                  loading={form.formState.isSubmitting}>
                  <Trans>Save</Trans>
                </Button>
              </div>
            </>
          )}
        </Form>
      </CardContent>
    </Card>
  );
}

import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Title, Text } from '@datum-cloud/datum-ui/typography';
import { z } from 'zod';

const testSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user', 'guest']),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  notifications: z.boolean().optional(),
});

export function FormDemo() {
  const handleSubmit = async (data: z.infer<typeof testSchema>) => {
    toast.success('Form submitted successfully!');
  };

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <Title level={2}>Form Demo</Title>
        <Text textColor="muted">Example using the new `@datum-cloud/datum-ui/form` API.</Text>
      </div>

      <Form.Root
        schema={testSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          name: '',
          email: '',
          role: 'user',
          bio: '',
          notifications: true,
        }}
        className="space-y-4">
        {({ isDirty, isSubmitting, isValid, reset }) => (
          <>
            <Form.Field name="name" label="Full Name" required>
              <Form.Input placeholder="Enter your full name" />
            </Form.Field>
            <Form.Field name="email" label="Email Address" required>
              <Form.Input type="email" placeholder="Enter your email" />
            </Form.Field>
            <Form.Field name="role" label="Role" required>
              <Form.Select>
                <Form.SelectItem value="admin">Admin</Form.SelectItem>
                <Form.SelectItem value="user">User</Form.SelectItem>
                <Form.SelectItem value="guest">Guest</Form.SelectItem>
              </Form.Select>
            </Form.Field>
            <Form.Field name="bio" label="Bio" required>
              <Form.Textarea placeholder="Write a short bio about yourself..." />
            </Form.Field>
            <Form.Field name="notifications">
              <Form.Switch label="Enable notifications" />
            </Form.Field>

            <div className="flex gap-2 pt-4">
              <Button htmlType="submit" disabled={!isDirty || !isValid || isSubmitting}>
                Submit
              </Button>
              <Button type="secondary" theme="outline" htmlType="button" onClick={reset}>
                Reset
              </Button>
            </div>
          </>
        )}
      </Form.Root>
    </div>
  );
}

import { toast } from '@datum-cloud/datum-ui/toast';
import { Title, Text } from '@datum-cloud/datum-ui/typography';
import { Button } from '@datum-ui/button';
import { Form } from '@datum-ui/form';
import { z } from 'zod';

const testSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(20, 'Name must be at most 20 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z.string().email('Invalid email address'),
  role: z
    .string()
    .min(1, 'Role is required')
    .refine((val) => val !== 'guest', 'Guest role is not allowed for this form'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(200, 'Bio is too long'),
  newsletter: z.boolean().optional(),
  skills: z.array(z.string()).min(1, 'Select at least one skill'),
  experience: z.string().min(1, 'Experience level is required'),
  notifications: z.boolean().optional(),
  terms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
  age: z.number().min(18, 'Must be at least 18 years old').max(100, 'Invalid age'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export function FormDemo() {
  const handleSubmit = async (data: z.infer<typeof testSchema>) => {
    console.log('Form submitted:', data);
    toast.success('Form submitted successfully!');
  };

  const handleRulesSubmit = async (data: any) => {
    console.log('Rules-based form submitted:', data);
    toast.success('Rules-based form submitted successfully!');
  };

  const roleOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'User', value: 'user' },
    { label: 'Guest', value: 'guest' },
  ];

  return (
    <div className="max-w-4xl space-y-12 p-6">
      {/* Schema-based Form Demo */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Title level={2}>Schema-based Form Demo</Title>
          <Text textColor="muted">
            This form uses Zod schema validation. The rules prop is redundant since Zod handles all
            validation.
          </Text>
        </div>

        <Form
          schema={testSchema}
          onSubmit={handleSubmit}
          defaultValues={{
            name: '',
            email: '',
            role: '',
            bio: '',
            newsletter: false,
            skills: [],
            experience: '',
            notifications: true,
            terms: false,
            age: 18,
            website: '',
          }}
          mode="onBlur"
          reValidateMode="onChange"
          shouldFocusError={true}
          criteriaMode="all"
          delayError={500}
          className="space-y-4">
          {(form) => (
            <>
              <Form.Input
                field="name"
                label="Full Name"
                placeholder="Enter your full name"
                required
                rules={{
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  maxLength: { value: 20, message: 'Name must be at most 20 characters' },
                  pattern: {
                    value: /^[a-zA-Z\s]+$/,
                    message: 'Name can only contain letters and spaces',
                  },
                }}
              />

              <Form.Input
                field="email"
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                required
                rules={{
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
              />

              <Form.Input
                field="age"
                label="Age"
                type="number"
                placeholder="Enter your age"
                required
                rules={{
                  min: { value: 18, message: 'Must be at least 18 years old' },
                  max: { value: 100, message: 'Invalid age' },
                }}
              />

              <Form.Input
                field="website"
                label="Website (Optional)"
                type="url"
                placeholder="https://example.com"
                rules={{
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Must be a valid URL starting with http:// or https://',
                  },
                }}
              />

              <Form.Select
                field="role"
                label="Role"
                description="Select your role in the organization"
                options={roleOptions}
                required
              />

              <Form.Textarea
                field="bio"
                label="Bio"
                description="Tell us about yourself"
                placeholder="Write a short bio about yourself..."
                required
              />

              <Form.Checkbox
                field="newsletter"
                label="Subscribe to newsletter"
                description="Receive updates about new features and announcements"
              />

              <Form.CheckboxGroup
                field="skills"
                label="Skills"
                description="Select all that apply"
                required>
                <Form.CheckboxItem value="react">React</Form.CheckboxItem>
                <Form.CheckboxItem value="typescript">TypeScript</Form.CheckboxItem>
                <Form.CheckboxItem value="nodejs">Node.js</Form.CheckboxItem>
                <Form.CheckboxItem value="python">Python</Form.CheckboxItem>
                <Form.CheckboxItem value="java">Java</Form.CheckboxItem>
                <Form.CheckboxItem value="golang">Go</Form.CheckboxItem>
              </Form.CheckboxGroup>

              <Form.RadioGroup
                field="experience"
                label="Experience Level"
                description="Select your experience level"
                required>
                <Form.Radio value="beginner">Beginner (0-2 years)</Form.Radio>
                <Form.Radio value="intermediate">Intermediate (2-5 years)</Form.Radio>
                <Form.Radio value="advanced">Advanced (5+ years)</Form.Radio>
              </Form.RadioGroup>

              <Form.Switch
                field="notifications"
                label="Enable notifications"
                description="Receive email notifications for important updates"
              />

              <Form.Checkbox
                field="terms"
                label="I accept the terms and conditions"
                description="You must accept the terms to continue"
                required
              />

              {/* Enhanced Form State Display */}
              <div className="bg-muted space-y-2 rounded-lg p-4">
                <Text className="font-semibold">Form State:</Text>
                <div className="space-y-1 text-sm">
                  <div>Is Valid: {form.formState.isValid ? '✅' : '❌'}</div>
                  <div>Is Dirty: {form.formState.isDirty ? '✅' : '❌'}</div>
                  <div>Is Submitting: {form.formState.isSubmitting ? '✅' : '❌'}</div>
                  <div>Is Validating: {form.formState.isValidating ? '✅' : '❌'}</div>
                  <div>Error Count: {Object.keys(form.formState.errors).length}</div>
                  <div>Touched Fields: {Object.keys(form.formState.touchedFields).length}</div>
                  <div>Dirty Fields: {Object.keys(form.formState.dirtyFields).length}</div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-4">
                <Button htmlType="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Submitting...' : 'Submit Form'}
                </Button>
                <Button
                  type="secondary"
                  theme="outline"
                  onClick={() => form.reset()}
                  disabled={form.formState.isSubmitting}>
                  Reset
                </Button>
                <Button
                  type="secondary"
                  theme="outline"
                  onClick={() => form.trigger()}
                  disabled={form.formState.isSubmitting}>
                  Validate All
                </Button>
              </div>
            </>
          )}
        </Form>
      </div>

      {/* Rules-based Form Demo */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Title level={2}>Rules-based Form Demo</Title>
          <Text textColor="muted">
            This form uses React Hook Form rules validation (no Zod schema). The rules prop is now
            functional and provides all validation.
          </Text>
        </div>

        <Form
          onSubmit={handleRulesSubmit}
          defaultValues={{
            name: '',
            email: '',
            age: 18,
            website: '',
            role: '',
            bio: '',
            newsletter: false,
            skills: [],
            experience: '',
            notifications: true,
            terms: false,
          }}
          mode="onBlur"
          reValidateMode="onChange"
          shouldFocusError={true}
          criteriaMode="all"
          delayError={500}
          className="space-y-4">
          {(form) => (
            <>
              <Form.Input
                field="name"
                label="Full Name"
                placeholder="Enter your full name"
                required
                rules={{
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  maxLength: { value: 20, message: 'Name must be at most 20 characters' },
                  pattern: {
                    value: /^[a-zA-Z\s]+$/,
                    message: 'Name can only contain letters and spaces',
                  },
                }}
              />

              <Form.Input
                field="email"
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                required
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
              />

              <Form.Input
                field="age"
                label="Age"
                type="number"
                placeholder="Enter your age"
                required
                rules={{
                  required: 'Age is required',
                  min: { value: 18, message: 'Must be at least 18 years old' },
                  max: { value: 100, message: 'Invalid age' },
                }}
              />

              <Form.Input
                field="website"
                label="Website (Optional)"
                type="url"
                placeholder="https://example.com"
                rules={{
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Must be a valid URL starting with http:// or https://',
                  },
                }}
              />

              <Form.Select
                field="role"
                label="Role"
                description="Select your role in the organization"
                options={roleOptions}
                required
                rules={{
                  required: 'Role is required',
                  validate: (value: any) =>
                    value !== 'guest' || 'Guest role is not allowed for this form',
                }}
              />

              <Form.Textarea
                field="bio"
                label="Bio"
                description="Tell us about yourself"
                placeholder="Write a short bio about yourself..."
                required
                rules={{
                  required: 'Bio is required',
                  minLength: { value: 10, message: 'Bio must be at least 10 characters' },
                  maxLength: { value: 200, message: 'Bio is too long' },
                }}
              />

              <Form.Checkbox
                field="newsletter"
                label="Subscribe to newsletter"
                description="Receive updates about new features and announcements"
              />

              <Form.CheckboxGroup
                field="skills"
                label="Skills"
                description="Select all that apply"
                required
                rules={{
                  required: 'Select at least one skill',
                  validate: (value: any) => value.length > 0 || 'Select at least one skill',
                }}>
                <Form.CheckboxItem value="react">React</Form.CheckboxItem>
                <Form.CheckboxItem value="typescript">TypeScript</Form.CheckboxItem>
                <Form.CheckboxItem value="nodejs">Node.js</Form.CheckboxItem>
                <Form.CheckboxItem value="python">Python</Form.CheckboxItem>
                <Form.CheckboxItem value="java">Java</Form.CheckboxItem>
                <Form.CheckboxItem value="golang">Go</Form.CheckboxItem>
              </Form.CheckboxGroup>

              <Form.RadioGroup
                field="experience"
                label="Experience Level"
                description="Select your experience level"
                required
                rules={{
                  required: 'Experience level is required',
                }}>
                <Form.Radio value="beginner">Beginner (0-2 years)</Form.Radio>
                <Form.Radio value="intermediate">Intermediate (2-5 years)</Form.Radio>
                <Form.Radio value="advanced">Advanced (5+ years)</Form.Radio>
              </Form.RadioGroup>

              <Form.Switch
                field="notifications"
                label="Enable notifications"
                description="Receive email notifications for important updates"
              />

              <Form.Checkbox
                field="terms"
                label="I accept the terms and conditions"
                description="You must accept the terms to continue"
                required
                rules={{
                  required: 'You must accept the terms and conditions',
                  validate: (value) => value === true || 'You must accept the terms and conditions',
                }}
              />

              {/* Enhanced Form State Display */}
              <div className="bg-muted space-y-2 rounded-lg p-4">
                <Text className="font-semibold">Rules-based Form State:</Text>
                <div className="space-y-1 text-sm">
                  <div>Is Valid: {form.formState.isValid ? '✅' : '❌'}</div>
                  <div>Is Dirty: {form.formState.isDirty ? '✅' : '❌'}</div>
                  <div>Is Submitting: {form.formState.isSubmitting ? '✅' : '❌'}</div>
                  <div>Is Validating: {form.formState.isValidating ? '✅' : '❌'}</div>
                  <div>Error Count: {Object.keys(form.formState.errors).length}</div>
                  <div>Touched Fields: {Object.keys(form.formState.touchedFields).length}</div>
                  <div>Dirty Fields: {Object.keys(form.formState.dirtyFields).length}</div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-4">
                <Button htmlType="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Submitting...' : 'Submit Rules Form'}
                </Button>
                <Button
                  type="secondary"
                  theme="outline"
                  onClick={() => form.reset()}
                  disabled={form.formState.isSubmitting}>
                  Reset
                </Button>
                <Button
                  type="secondary"
                  theme="outline"
                  onClick={() => form.trigger()}
                  disabled={form.formState.isSubmitting}>
                  Validate All
                </Button>
              </div>
            </>
          )}
        </Form>
      </div>
    </div>
  );
}

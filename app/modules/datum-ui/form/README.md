# Form Component Library

A comprehensive, type-safe form library built with React Hook Form, Zod validation, and shadcn/ui components. This library provides a compound component pattern for easy form creation with built-in validation, error handling, and accessibility features.

## Features

- 🔒 **Type-safe**: Full TypeScript support with Zod schema validation
- 🎯 **Compound Components**: Intuitive API with nested component structure
- ✅ **Dual Validation**: Support for both Zod schema validation and React Hook Form rules validation
- 🎨 **Consistent Styling**: Built on shadcn/ui for consistent design
- ♿ **Accessible**: ARIA attributes and keyboard navigation support
- 🔄 **Flexible**: Support for render props and direct children patterns
- 📱 **Responsive**: Mobile-friendly form components

## Installation

The form components are part of the staff portal application and are available through the compound component pattern:

```tsx
import { Form } from '@/components/form';
```

## Basic Usage

The Form component supports two validation modes:

### 1. Schema-based Validation (Recommended)

Use Zod schemas for type-safe validation with automatic TypeScript inference.

```tsx
import { Form } from '@/components/form';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18 years old'),
});

type UserForm = z.infer<typeof userSchema>;

function UserForm() {
  const handleSubmit = (values: UserForm) => {
    console.log('Form submitted:', values);
  };

  return (
    <Form
      schema={userSchema}
      defaultValues={{
        name: '',
        email: '',
        age: 18,
      }}
      onSubmit={handleSubmit}>
      <Form.Input field="name" label="Full Name" placeholder="Enter your full name" required />
      <Form.Input
        field="email"
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        required
      />
      <Form.Input field="age" label="Age" type="number" placeholder="Enter your age" required />
      <button type="submit">Submit</button>
    </Form>
  );
}
```

### 2. Rules-based Validation

Use React Hook Form's native validation rules without a schema.

```tsx
import { Form } from '@/components/form';

function UserForm() {
  const handleSubmit = (values: any) => {
    console.log('Form submitted:', values);
  };

  return (
    <Form
      defaultValues={{
        name: '',
        email: '',
        age: 18,
      }}
      onSubmit={handleSubmit}>
      <Form.Input
        field="name"
        label="Full Name"
        placeholder="Enter your full name"
        required
        rules={{
          required: 'Name is required',
          minLength: { value: 2, message: 'Name must be at least 2 characters' },
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
      <button type="submit">Submit</button>
    </Form>
  );
}
```

## Available Components

### Form (Root Component)

The main form wrapper that provides context and handles form submission. Supports both schema-based and rules-based validation.

#### Props

| Prop                        | Type                                                           | Default        | Description                                                |
| --------------------------- | -------------------------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `schema`                    | `ZodSchema` (optional)                                         | -              | Zod schema for validation and type inference (schema mode) |
| `defaultValues`             | `z.infer<TSchema> \| Record<string, any>`                      | -              | Initial form values                                        |
| `onSubmit`                  | `(values: z.infer<TSchema> \| any) => void`                    | -              | Submit handler function                                    |
| `children`                  | `ReactNode \| (form: UseFormReturn) => ReactNode`              | -              | Form content or render prop                                |
| `className`                 | `string`                                                       | -              | CSS classes for the form element                           |
| `mode`                      | `'onSubmit' \| 'onBlur' \| 'onChange' \| 'onTouched' \| 'all'` | `'onSubmit'`   | When validation occurs                                     |
| `reValidateMode`            | `'onChange' \| 'onBlur' \| 'onSubmit'`                         | `'onChange'`   | When re-validation occurs                                  |
| `shouldFocusError`          | `boolean`                                                      | `true`         | Auto-focus first error field                               |
| `shouldUseNativeValidation` | `boolean`                                                      | `false`        | Use browser HTML5 validation                               |
| `shouldUnregister`          | `boolean`                                                      | `false`        | Remove fields on unmount                                   |
| `criteriaMode`              | `'firstError' \| 'all'`                                        | `'firstError'` | Error display mode                                         |
| `delayError`                | `number`                                                       | -              | Delay error display (ms)                                   |

#### Validation Modes

The Form component automatically detects which validation mode to use:

1. **Schema Mode**: When a `schema` prop is provided, the form uses Zod validation
2. **Rules Mode**: When no `schema` is provided, the form uses React Hook Form's native validation rules

**Note**: In schema mode, the `rules` prop on individual fields is redundant since Zod handles all validation. In rules mode, the `rules` prop is required for validation.

### Form.Input

Text input field with validation and error handling.

#### Props

| Prop            | Type                | Default | Description                         |
| --------------- | ------------------- | ------- | ----------------------------------- |
| `field`         | `string`            | -       | Form field name (must match schema) |
| `label`         | `string`            | -       | Field label                         |
| `description`   | `string`            | -       | Field description/help text         |
| `required`      | `boolean \| string` | -       | Required field indicator            |
| `hideError`     | `boolean`           | `false` | Hide error message                  |
| `rules`         | `ValidationRules`   | -       | Additional validation rules         |
| `...inputProps` | `InputProps`        | -       | All standard input props            |

#### Validation Rules

```tsx
rules={{
  required: true, // or string message
  min: 0, // or { value: 0, message: 'Must be positive' }
  max: 100, // or { value: 100, message: 'Must be less than 100' }
  minLength: 2, // or { value: 2, message: 'Too short' }
  maxLength: 50, // or { value: 50, message: 'Too long' }
  pattern: /^[a-zA-Z]+$/, // or { value: /^[a-zA-Z]+$/, message: 'Letters only' }
  validate: (value) => value === 'admin' ? 'Username taken' : true,
}}
```

#### Example

```tsx
<Form.Input
  field="username"
  label="Username"
  description="Choose a unique username"
  placeholder="Enter username"
  required="Username is required"
  rules={{
    minLength: { value: 3, message: 'Username must be at least 3 characters' },
    pattern: {
      value: /^[a-zA-Z0-9_]+$/,
      message: 'Only letters, numbers, and underscores allowed',
    },
  }}
/>
```

### Form.Textarea

Multi-line text input field.

#### Props

Same as `Form.Input` with additional textarea-specific props.

#### Example

```tsx
<Form.Textarea
  field="bio"
  label="Biography"
  description="Tell us about yourself"
  placeholder="Enter your biography..."
  rows={4}
  required
/>
```

### Form.Select

Dropdown selection field.

#### Props

| Prop          | Type             | Default              | Description              |
| ------------- | ---------------- | -------------------- | ------------------------ |
| `field`       | `string`         | -                    | Form field name          |
| `label`       | `string`         | -                    | Field label              |
| `description` | `string`         | -                    | Field description        |
| `required`    | `boolean`        | -                    | Required field indicator |
| `hideError`   | `boolean`        | `false`              | Hide error message       |
| `options`     | `SelectOption[]` | -                    | Available options        |
| `placeholder` | `string`         | `'Select an option'` | Placeholder text         |

#### Example

```tsx
<Form.Select
  field="country"
  label="Country"
  description="Select your country of residence"
  options={[
    { label: 'United States', value: 'us' },
    { label: 'Canada', value: 'ca' },
    { label: 'United Kingdom', value: 'uk' },
  ]}
  placeholder="Choose a country"
  required
/>
```

### Form.Checkbox

Single checkbox field.

#### Props

| Prop          | Type      | Default | Description              |
| ------------- | --------- | ------- | ------------------------ |
| `field`       | `string`  | -       | Form field name          |
| `label`       | `string`  | -       | Checkbox label           |
| `description` | `string`  | -       | Field description        |
| `required`    | `boolean` | -       | Required field indicator |
| `hideError`   | `boolean` | `false` | Hide error message       |

#### Example

```tsx
<Form.Checkbox
  field="terms"
  label="I agree to the terms and conditions"
  description="You must accept the terms to continue"
  required
/>
```

### Form.CheckboxGroup

Group of related checkboxes with shared validation.

#### Props

| Prop          | Type        | Default | Description                              |
| ------------- | ----------- | ------- | ---------------------------------------- |
| `field`       | `string`    | -       | Form field name (stores array of values) |
| `label`       | `string`    | -       | Group label                              |
| `description` | `string`    | -       | Group description                        |
| `required`    | `boolean`   | -       | Required field indicator                 |
| `hideError`   | `boolean`   | `false` | Hide error message                       |
| `children`    | `ReactNode` | -       | Checkbox items                           |

#### Example

```tsx
<Form.CheckboxGroup
  field="interests"
  label="Interests"
  description="Select all that apply"
  required>
  <Form.CheckboxItem value="sports" label="Sports" />
  <Form.CheckboxItem value="music" label="Music" />
  <Form.CheckboxItem value="reading" label="Reading" />
  <Form.CheckboxItem value="travel" label="Travel" />
</Form.CheckboxGroup>
```

### Form.CheckboxItem

Individual checkbox within a checkbox group.

#### Props

| Prop       | Type      | Default | Description      |
| ---------- | --------- | ------- | ---------------- |
| `value`    | `string`  | -       | Checkbox value   |
| `label`    | `string`  | -       | Checkbox label   |
| `disabled` | `boolean` | -       | Disable checkbox |

### Form.RadioGroup

Group of radio buttons with shared validation.

#### Props

| Prop          | Type        | Default | Description              |
| ------------- | ----------- | ------- | ------------------------ |
| `field`       | `string`    | -       | Form field name          |
| `label`       | `string`    | -       | Group label              |
| `description` | `string`    | -       | Group description        |
| `required`    | `boolean`   | -       | Required field indicator |
| `hideError`   | `boolean`   | `false` | Hide error message       |
| `children`    | `ReactNode` | -       | Radio items              |

#### Example

```tsx
<Form.RadioGroup field="gender" label="Gender" description="Select your gender" required>
  <Form.Radio value="male" label="Male" />
  <Form.Radio value="female" label="Female" />
  <Form.Radio value="other" label="Other" />
</Form.RadioGroup>
```

### Form.Radio

Individual radio button within a radio group.

#### Props

| Prop       | Type      | Default | Description   |
| ---------- | --------- | ------- | ------------- |
| `value`    | `string`  | -       | Radio value   |
| `label`    | `string`  | -       | Radio label   |
| `disabled` | `boolean` | -       | Disable radio |

### Form.Switch

Toggle switch field.

#### Props

| Prop          | Type      | Default | Description              |
| ------------- | --------- | ------- | ------------------------ |
| `field`       | `string`  | -       | Form field name          |
| `label`       | `string`  | -       | Switch label             |
| `description` | `string`  | -       | Field description        |
| `required`    | `boolean` | -       | Required field indicator |
| `hideError`   | `boolean` | `false` | Hide error message       |

#### Example

```tsx
<Form.Switch
  field="notifications"
  label="Email Notifications"
  description="Receive email updates about your account"
/>
```

## Advanced Usage

### Using Render Props

You can access the form instance directly using render props:

```tsx
<Form schema={userSchema} defaultValues={defaultValues} onSubmit={handleSubmit}>
  {(form) => (
    <div>
      <Form.Input field="name" label="Name" required />
      <Form.Input field="email" label="Email" required />

      {/* Access form methods directly */}
      <button type="button" onClick={() => form.reset()}>
        Reset Form
      </button>

      <button type="submit">Submit</button>
    </div>
  )}
</Form>
```

### Complex Schema Example

```tsx
import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
});

const userSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
  }),
  address: addressSchema,
  preferences: z.object({
    newsletter: z.boolean(),
    notifications: z.boolean(),
    theme: z.enum(['light', 'dark', 'auto']),
  }),
});

function ComplexForm() {
  return (
    <Form
      schema={userSchema}
      defaultValues={{
        personalInfo: { firstName: '', lastName: '', email: '', phone: '' },
        address: { street: '', city: '', zipCode: '' },
        preferences: { newsletter: false, notifications: true, theme: 'light' },
      }}
      onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <h3>Personal Information</h3>
          <Form.Input field="personalInfo.firstName" label="First Name" required />
          <Form.Input field="personalInfo.lastName" label="Last Name" required />
          <Form.Input field="personalInfo.email" label="Email" type="email" required />
          <Form.Input field="personalInfo.phone" label="Phone" type="tel" />
        </div>

        <div>
          <h3>Address</h3>
          <Form.Input field="address.street" label="Street" required />
          <Form.Input field="address.city" label="City" required />
          <Form.Input field="address.zipCode" label="ZIP Code" required />
        </div>

        <div>
          <h3>Preferences</h3>
          <Form.Switch field="preferences.newsletter" label="Newsletter" />
          <Form.Switch field="preferences.notifications" label="Notifications" />
          <Form.Select
            field="preferences.theme"
            label="Theme"
            options={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'Auto', value: 'auto' },
            ]}
          />
        </div>
      </div>
    </Form>
  );
}
```

### Custom Validation

```tsx
const customSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

function PasswordForm() {
  return (
    <Form
      schema={customSchema}
      defaultValues={{ password: '', confirmPassword: '' }}
      onSubmit={handleSubmit}>
      <Form.Input field="password" label="Password" type="password" required />
      <Form.Input field="confirmPassword" label="Confirm Password" type="password" required />
    </Form>
  );
}
```

## Styling

All form components use shadcn/ui styling and can be customized using Tailwind CSS classes. The components automatically handle:

- Required field indicators (red asterisk)
- Error states and messages
- Focus states
- Disabled states
- Responsive design

### Custom Styling Example

```tsx
<Form
  schema={schema}
  defaultValues={defaultValues}
  onSubmit={handleSubmit}
  className="mx-auto max-w-md space-y-4 rounded-lg bg-white p-6 shadow-md">
  <Form.Input field="email" label="Email" className="w-full" required />
</Form>
```

## Error Handling

The form library provides comprehensive error handling:

- **Validation Errors**: Displayed below each field
- **Form-level Errors**: Can be accessed via the form instance
- **Custom Error Messages**: Support for custom validation messages
- **Error Focus**: Automatic focus on first error field (configurable)

### Accessing Form Errors

```tsx
<Form schema={schema} defaultValues={defaultValues} onSubmit={handleSubmit}>
  {(form) => (
    <div>
      <Form.Input field="email" label="Email" required />

      {/* Display form-level errors */}
      {form.formState.errors.root && (
        <div className="text-sm text-red-500">{form.formState.errors.root.message}</div>
      )}
    </div>
  )}
</Form>
```

## Best Practices

1. **Use Zod Schemas**: Always define your form structure with Zod for type safety
2. **Provide Default Values**: Ensure all form fields have appropriate default values
3. **Handle Errors Gracefully**: Use try-catch blocks in your submit handlers
4. **Accessibility**: Always provide labels and descriptions for form fields
5. **Validation**: Use both client-side (Zod) and server-side validation
6. **Performance**: Use `React.memo` for complex form components if needed

## Troubleshooting

### Common Issues

1. **Field not found**: Ensure the `field` prop matches your Zod schema structure
2. **Type errors**: Check that your `defaultValues` match the inferred schema type
3. **Validation not working**: Verify your Zod schema is correctly defined
4. **Context errors**: Ensure all form components are wrapped in a `Form` component

### Debug Mode

Enable debug mode to see form state:

```tsx
<Form schema={schema} defaultValues={defaultValues} onSubmit={handleSubmit}>
  {(form) => (
    <div>
      <pre>{JSON.stringify(form.formState, null, 2)}</pre>
      {/* Your form fields */}
    </div>
  )}
</Form>
```

## Contributing

When adding new form components:

1. Follow the existing component structure
2. Use the `useFormContext` hook for form integration
3. Include proper TypeScript types
4. Add comprehensive props documentation
5. Include usage examples
6. Ensure accessibility compliance

import { Form } from './form';
import { FormCheckbox } from './form-checkbox';
import { FormCheckboxGroup, FormCheckboxItem } from './form-checkbox-group';
import { FormProvider } from './form-context';
import { FormInput } from './form-input';
import { FormRadioGroup, FormRadio } from './form-radio-group';
import { FormSelect } from './form-select';
import { FormSwitch } from './form-switch';
import { FormTextarea } from './form-textarea';

const FormCompound = Object.assign(Form, {
  Input: FormInput,
  Textarea: FormTextarea,
  Select: FormSelect,
  Checkbox: FormCheckbox,
  CheckboxGroup: FormCheckboxGroup,
  CheckboxItem: FormCheckboxItem,
  RadioGroup: FormRadioGroup,
  Radio: FormRadio,
  Switch: FormSwitch,
  Provider: FormProvider,
});

export { FormCompound as Form };

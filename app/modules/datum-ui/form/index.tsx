import { Form } from './form';
import { FormAutocomplete } from './form-autocomplete';
import { FormCheckbox } from './form-checkbox';
import { FormCheckboxGroup, FormCheckboxItem } from './form-checkbox-group';
import { FormDatePicker } from './form-date-picker';
import { FormDateTimePicker } from './form-datetime-picker';
import { FormProvider } from './form-context';
import { FormInput } from './form-input';
import { FormRadioGroup, FormRadio } from './form-radio-group';
import { FormSelect } from './form-select';
import { FormSwitch } from './form-switch';
import { FormTextarea } from './form-textarea';
import { FormTimePicker } from './form-time-picker';

const FormCompound = Object.assign(Form, {
  Input: FormInput,
  Textarea: FormTextarea,
  Select: FormSelect,
  Autocomplete: FormAutocomplete,
  Checkbox: FormCheckbox,
  CheckboxGroup: FormCheckboxGroup,
  CheckboxItem: FormCheckboxItem,
  RadioGroup: FormRadioGroup,
  Radio: FormRadio,
  Switch: FormSwitch,
  DatePicker: FormDatePicker,
  TimePicker: FormTimePicker,
  DateTimePicker: FormDateTimePicker,
  Provider: FormProvider,
});

export { FormCompound as Form };

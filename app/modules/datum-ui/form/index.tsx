import { Form } from './form';
import { FormAutocomplete } from './form-autocomplete';
import { FormAutosearch } from './form-autosearch';
import { FormCheckbox } from './form-checkbox';
import { FormCheckboxGroup, FormCheckboxItem } from './form-checkbox-group';
import { FormProvider } from './form-context';
import { FormDatePicker } from './form-date-picker';
import { FormDateTimePicker } from './form-datetime-picker';
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
  Autosearch: FormAutosearch,
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

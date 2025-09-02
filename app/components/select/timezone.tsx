'use client';

import { SelectAutocomplete, type SelectOption } from './autocomplete';
import timezonesData from './timezones.json';
import * as React from 'react';

/**
 * Timezone data structure from the JSON file
 */
export interface TimezoneData {
  label: string;
  tzCode: string;
  name: string;
  utc: string;
}

/**
 * Extended SelectOption with timezone-specific properties
 */
export interface TimezoneOption extends SelectOption {
  tzCode: string;
  name: string;
  utc: string;
}

/**
 * Props for the SelectTimezone component
 */
export interface SelectTimezoneProps {
  selectedValue?: TimezoneOption | string;
  onValueChange?: (value: TimezoneOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  width?: string;
  maxHeight?: string;
}

/**
 * Transform timezone data to TimezoneOption format for SelectAutocomplete
 */
const transformTimezoneToOption = (timezone: TimezoneData): TimezoneOption => ({
  value: timezone.tzCode,
  label: timezone.label.replace('_', ' '),
  tzCode: timezone.tzCode,
  name: timezone.name,
  utc: timezone.utc,
});

/**
 * SelectTimezone component that uses SelectAutocomplete with timezone data
 */
export const SelectTimezone = ({
  selectedValue,
  onValueChange,
  placeholder = 'Select timezone...',
  searchPlaceholder = 'Search timezones...',
  emptyMessage = 'No timezones found.',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  width = 'w-full',
  maxHeight = 'max-h-[300px]',
}: SelectTimezoneProps) => {
  // Transform timezone data to options
  const options: TimezoneOption[] = React.useMemo(() => {
    return timezonesData.map(transformTimezoneToOption);
  }, []);

  // Find timezone option by tzCode string
  const findTimezoneByCode = React.useCallback(
    (tzCode: string): TimezoneOption | undefined => {
      return options.find((option) => option.tzCode === tzCode);
    },
    [options]
  );

  // Resolve the actual selected value (handle both TimezoneOption and string types)
  const resolvedSelectedValue: string | undefined = React.useMemo(() => {
    if (selectedValue) {
      if (typeof selectedValue === 'string') {
        return selectedValue;
      }
      return selectedValue.value;
    }
    return undefined;
  }, [selectedValue]);

  // Handle value change
  const handleValueChange = React.useCallback(
    (value: string) => {
      if (onValueChange) {
        const timezoneOption = findTimezoneByCode(value);
        if (timezoneOption) {
          onValueChange(timezoneOption);
        }
      }
    },
    [onValueChange, findTimezoneByCode]
  );

  return (
    <SelectAutocomplete
      options={options}
      value={resolvedSelectedValue}
      onValueChange={handleValueChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      contentClassName={contentClassName}
      width={width}
      maxHeight={maxHeight}
    />
  );
};

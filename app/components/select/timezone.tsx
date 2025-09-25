'use client';

import { GroupedSelectAutocomplete, type GroupedSelectOption } from './autocomplete-grouped';
import { getTimeZones } from '@vvo/tzdb';
import * as React from 'react';

/**
 * Timezone data structure from @vvo/tzdb
 */
export interface TimezoneData {
  name: string;
  alternativeName: string;
  group: string[];
  continentCode: string;
  continentName: string;
  countryName: string;
  countryCode: string;
  mainCities: string[];
  rawOffsetInMinutes: number;
  abbreviation: string;
  rawFormat: string;
  currentTimeOffsetInMinutes: number;
  currentTimeFormat: string;
}

/**
 * SelectOption with timezone-specific properties
 */
export interface TimezoneOption extends GroupedSelectOption {
  timezoneName: string;
  alternativeName: string;
  mainCities: string[];
  countryName: string;
  continentName: string;
  abbreviation: string;
  currentTimeFormat: string;
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
 * Transform timezone data to TimezoneOption format
 */
const transformTimezoneToOption = (timezone: TimezoneData): TimezoneOption => ({
  value: timezone.name,
  label: timezone.currentTimeFormat,
  group: timezone.continentName,
  timezoneName: timezone.name,
  alternativeName: timezone.alternativeName,
  mainCities: timezone.mainCities,
  countryName: timezone.countryName,
  continentName: timezone.continentName,
  abbreviation: timezone.abbreviation,
  currentTimeFormat: timezone.currentTimeFormat,
});

/**
 * SelectTimezone component using @vvo/tzdb
 */
export const SelectTimezone = ({
  selectedValue,
  onValueChange,
  placeholder = 'Select timezone...',
  searchPlaceholder = 'Search timezones or cities...',
  emptyMessage = 'No timezones found.',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  width = 'w-full',
  maxHeight = 'max-h-[300px]',
}: SelectTimezoneProps) => {
  const timezoneData = React.useMemo(() => getTimeZones({ includeUtc: true }), []);

  // Transform timezone data to options with enhanced search
  const options: TimezoneOption[] = React.useMemo(() => {
    return timezoneData.map(transformTimezoneToOption);
  }, [timezoneData]);

  // Create enhanced search options that include city names in the value for search
  const searchOptions: TimezoneOption[] = React.useMemo(() => {
    return options.map((option) => ({
      ...option,
      // Include cities, country, and alternative names in the searchable value
      value: [
        option.timezoneName,
        option.alternativeName,
        option.countryName,
        option.continentName,
        option.abbreviation,
        ...option.mainCities,
      ].join(' '),
    }));
  }, [options]);

  // Find timezone option by timezone name
  const findTimezoneByName = React.useCallback(
    (timezoneName: string): TimezoneOption | undefined => {
      return options.find((option) => option.timezoneName === timezoneName);
    },
    [options]
  );

  // Resolve the actual selected value (handle both EnhancedTimezoneOption and string types)
  const resolvedSelectedValue: string | undefined = React.useMemo(() => {
    if (selectedValue) {
      if (typeof selectedValue === 'string') {
        // Find the enhanced search option for this timezone name
        const searchOption = searchOptions.find((option) => option.timezoneName === selectedValue);
        return searchOption?.value;
      }
      // Find the enhanced search option for this timezone option
      const searchOption = searchOptions.find(
        (option) => option.timezoneName === selectedValue.timezoneName
      );
      return searchOption?.value;
    }
    return undefined;
  }, [selectedValue, searchOptions]);

  // Handle value change - extract timezone name from the enhanced search value
  const handleValueChange = React.useCallback(
    (value: string) => {
      if (onValueChange) {
        // Extract the timezone name from the enhanced search value (first part before space)
        const timezoneName = value.split(' ')[0];
        const timezoneOption = findTimezoneByName(timezoneName);
        if (timezoneOption) {
          onValueChange(timezoneOption);
        }
      }
    },
    [onValueChange, findTimezoneByName]
  );

  return (
    <GroupedSelectAutocomplete
      options={searchOptions}
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
      groupBy="continentName"
    />
  );
};

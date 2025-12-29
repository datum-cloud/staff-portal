import { useClientDataTableInstance } from '../providers/client-data-table.provider';
import {
  DataTableFacetFilter,
  type FacetMenuItem,
  type FacetOption,
} from '@datum-ui/data-table/components/data-table-facet-filter';
import { t } from '@lingui/core/macro';

export interface ClientDataTableFacetFilterProps {
  filterKey: string;
  label: string;
  placeholder?: string;
  options: FacetOption[];
  multiSelect?: boolean;
  clearLabel?: string;
  menuItems?: FacetMenuItem[];
  className?: string;
}

export function ClientDataTableFacetFilter({
  filterKey,
  label,
  placeholder,
  options,
  multiSelect = false,
  clearLabel = t`Clear`,
  menuItems,
  className,
}: ClientDataTableFacetFilterProps) {
  const { filters, setFilter, clearFilter, useFilters } = useClientDataTableInstance();

  // Don't render if filters are not enabled
  if (!useFilters) {
    return null;
  }

  const value = filters[filterKey];

  const handleValueChange = (newValue: string | string[] | undefined) => {
    if (newValue === undefined) {
      clearFilter(filterKey);
    } else {
      setFilter(filterKey, newValue);
    }
  };

  return (
    <DataTableFacetFilter
      label={label}
      placeholder={placeholder}
      options={options}
      value={value}
      onValueChange={handleValueChange}
      multiSelect={multiSelect}
      clearLabel={clearLabel}
      menuItems={menuItems}
      className={className}
    />
  );
}


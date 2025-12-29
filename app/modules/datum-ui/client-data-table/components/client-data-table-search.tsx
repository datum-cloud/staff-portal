import { useClientDataTableInstance } from '../providers/client-data-table.provider';
import { DataTableSearch } from '@datum-ui/data-table/components/data-table-search';
import { t } from '@lingui/core/macro';

interface ClientDataTableSearchProps {
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function ClientDataTableSearch({
  placeholder = t`Search...`,
  debounceMs = 300,
  className = 'w-64',
}: ClientDataTableSearchProps) {
  const { search, setSearch, useSearch } = useClientDataTableInstance();

  // Don't render if search is not enabled
  if (!useSearch || !setSearch) {
    return null;
  }

  return (
    <DataTableSearch
      placeholder={placeholder}
      value={search}
      onValueChange={setSearch}
      debounceMs={debounceMs}
      className={className}
    />
  );
}

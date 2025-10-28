import { Input } from '@/modules/shadcn/ui/input';
import { t } from '@lingui/core/macro';
import { useEffect, useState } from 'react';

interface DataTableSearchProps {
  placeholder?: string;
  value?: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export function DataTableSearch({
  placeholder = t`Search...`,
  value,
  onValueChange,
  debounceMs = 300,
  className = 'w-64',
}: DataTableSearchProps) {
  const [searchInput, setSearchInput] = useState(value || '');

  // Sync external value changes
  useEffect(() => {
    if (value !== undefined && value !== searchInput) {
      setSearchInput(value);
    }
  }, [value, searchInput]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onValueChange(searchInput);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchInput, onValueChange, debounceMs]);

  return (
    <Input
      placeholder={placeholder}
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      className={className}
    />
  );
}

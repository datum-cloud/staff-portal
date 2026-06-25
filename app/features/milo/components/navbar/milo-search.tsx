import { miloIconButtonClass } from './milo-icon-button';
import { SearchResults } from '@/components/app-search/search-results';
import { useAppSearch } from '@/components/app-search/use-app-search';
import { Button } from '@datum-cloud/datum-ui/button';
import { Input } from '@datum-cloud/datum-ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { useLingui } from '@lingui/react/macro';
import { SearchIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

/**
 * Global search as a navbar icon button that opens a dropdown popover anchored
 * under it: a search input over the shared results list. Reuses the existing
 * useAppSearch hook + SearchResults, so behaviour matches the legacy search.
 * Cmd/Ctrl+K opens it.
 */
export function MiloSearch() {
  const { t } = useLingui();
  const state = useAppSearch();
  const { open, setOpen, search, setSearch } = state;
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K opens the dropdown.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}>
      <PopoverTrigger asChild>
        <Button
          htmlType="button"
          type="tertiary"
          theme="borderless"
          size="icon"
          aria-label={t`Search`}
          className={miloIconButtonClass}>
          <SearchIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}>
        <div className="border-b p-2">
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t`Search users, organizations, and projects`}
            className="h-9 border-none shadow-none focus-visible:shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          />
        </div>
        <div className="max-h-[60svh] overflow-y-auto">
          <SearchResults state={state} listClassName="max-h-none" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

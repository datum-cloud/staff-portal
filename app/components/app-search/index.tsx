'use client';

import { SearchResults } from './search-results';
import { useAppSearch } from './use-app-search';
import { Input } from '@datum-cloud/datum-ui/input';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  className?: string;
  placeholder?: string;
}

function AppSearch({ className = '', placeholder }: Props) {
  const state = useAppSearch();
  const { open, setOpen, search, setSearch } = state;
  const { t } = useLingui();
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 420 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Cmd+K focuses the search input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Click outside closes the panel — must exclude the portalled panel itself,
  // otherwise mousedown on a result fires before onSelect and closes the panel.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inInput = containerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inInput && !inPanel) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpen, setSearch]);

  // Blur input after a command runs so the caret disappears with the panel
  const wrappedState = {
    ...state,
    runCommand: (command: () => unknown) => {
      inputRef.current?.blur();
      state.runCommand(command);
    },
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="bg-muted/25 hover:bg-muted/50 text-muted-foreground flex h-8 w-full items-center gap-1.5 rounded-md border px-2 md:w-40 lg:w-56 xl:w-64">
        <SearchIcon className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        <Input
          ref={inputRef}
          className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:border-0 focus-visible:shadow-none focus-visible:ring-0"
          placeholder={placeholder ?? t`Search`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setDropdownPos({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 420),
              });
            }
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setSearch('');
              inputRef.current?.blur();
            }
          }}
        />
        {!open && (
          <kbd className="bg-muted pointer-events-none hidden h-5 shrink-0 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="bg-popover text-popover-foreground fixed z-50 rounded-md border shadow-md"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}>
            <SearchResults state={wrappedState} listClassName="max-h-[400px]" />
          </div>,
          document.body
        )}
    </div>
  );
}

export default AppSearch;

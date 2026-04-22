'use client';

import { SearchResults } from './search-results';
import { useAppSearch } from './use-app-search';
import { Button } from '@datum-cloud/datum-ui/button';
import { Input } from '@datum-cloud/datum-ui/input';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@datum-cloud/datum-ui/sheet';
import { useLingui } from '@lingui/react/macro';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { SearchIcon, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

function AppSearchMobile() {
  const state = useAppSearch();
  const { open, setOpen, search, setSearch } = state;
  const { t } = useLingui();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when the sheet opens
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  return (
    <>
      <Button
        htmlType="button"
        theme="borderless"
        size="icon"
        aria-label={t`Open search`}
        onClick={() => setOpen(true)}>
        <SearchIcon className="h-4 w-4" />
      </Button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}>
        <SheetContent
          side="top"
          className="flex h-[50svh] flex-col gap-0 p-0 [&>button:last-child]:hidden">
          <VisuallyHidden>
            <SheetTitle>{t`Search`}</SheetTitle>
            <SheetDescription>{t`Search users, organizations, and projects`}</SheetDescription>
          </VisuallyHidden>

          <SheetHeader className="sticky top-0 z-10 flex-row items-center gap-2 border-b px-3 py-2">
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t`Search`}
              className="h-9 flex-1 shadow-none focus-visible:shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
            />
            <SheetClose asChild>
              <Button htmlType="button" theme="borderless" size="icon" aria-label={t`Close`}>
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <SearchResults state={state} listClassName="max-h-none" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default AppSearchMobile;

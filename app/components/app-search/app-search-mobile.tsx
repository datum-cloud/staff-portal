'use client';

import { SearchResults } from './search-results';
import { useAppSearch } from './use-app-search';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Command, CommandInput } from '@datum-cloud/datum-ui/command';
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
        <ACTION_ICONS.search className="h-4 w-4" />
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

          {/* Input and list share one Command so cmdk drives ↑/↓/Enter (#721). */}
          <Command shouldFilter={false} className="flex min-h-0 flex-1 flex-col">
            <SheetHeader className="sticky top-0 z-10 flex-row items-center gap-2 border-b px-3 py-2">
              <CommandInput
                ref={inputRef}
                value={search}
                onValueChange={setSearch}
                placeholder={t`Search`}
                wrapperClassName="flex-1 border-0 px-0"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false);
                }}
              />
              <SheetClose asChild>
                <Button htmlType="button" theme="borderless" size="icon" aria-label={t`Close`}>
                  <ACTION_ICONS.close className="h-4 w-4" />
                </Button>
              </SheetClose>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <SearchResults state={state} listClassName="max-h-none" />
            </div>
          </Command>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default AppSearchMobile;

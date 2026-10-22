import { SearchResults } from '@/components/app-search/search-results';
import { useAppSearch } from '@/components/app-search/use-app-search';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Command, CommandInput } from '@datum-cloud/datum-ui/command';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Popover, PopoverAnchor, PopoverContent } from '@datum-cloud/datum-ui/popover';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { Search } from 'lucide-react';
import { useRef } from 'react';

interface HomeHeaderProps {
  givenName?: string;
  environment?: string;
}

export function HomeHeader({ givenName, environment }: HomeHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 @3xl/main:flex-row @3xl/main:items-start @3xl/main:justify-between @3xl/main:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <Title
            as="h1"
            level={2}
            weight="normal"
            textColor="default"
            className="font-title tracking-normal break-words">
            <Trans>Datum Platform</Trans>
          </Title>
          <Text as="p" weight="normal" className="text-foreground/60">
            {givenName ? <Trans>Welcome back, {givenName}.</Trans> : <Trans>Welcome back.</Trans>}{' '}
            <Trans>Here&apos;s what&apos;s happening across the platform.</Trans>
          </Text>
        </div>
        {environment && (
          <Badge type="muted" theme="solid" className="shrink-0 self-start">
            {environment}
          </Badge>
        )}
      </div>
      <HeroSearch />
    </div>
  );
}

/**
 * The navbar's global search, inlined as the page's hero input: same
 * useAppSearch state and SearchResults list, with results in a popover
 * anchored under the input.
 */
function HeroSearch() {
  const { t } = useLingui();
  const state = useAppSearch();
  const { open, setOpen, search, setSearch } = state;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Popover
      open={open && search.trim().length > 0}
      onOpenChange={(next) => {
        if (!next) setOpen(false);
      }}>
      {/* Anchor and portalled list share one Command (display:contents keeps it
          layout-neutral) so cmdk drives ↑/↓/Enter across the results (#721). */}
      <Command shouldFilter={false} className="contents">
        <PopoverAnchor asChild>
          <div className="bg-card border-input flex h-12 items-center gap-2 rounded-lg border px-3 shadow-xs">
            <Icon icon={Search} size={16} className="text-icon-quaternary shrink-0" aria-hidden />
            <CommandInput
              ref={inputRef}
              value={search}
              onValueChange={(value) => {
                setSearch(value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder={t`Search users, organizations, projects, domains…`}
              aria-label={t`Search the platform`}
              wrapperClassName="h-full flex-1 border-0 px-0"
              iconClassName="hidden"
              className="h-full border-none bg-transparent px-0 text-sm shadow-none focus-visible:shadow-none focus-visible:ring-0"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-(--radix-popover-trigger-width) overflow-hidden p-0"
          // Keep focus in the input so typing keeps refining the results.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (e.target instanceof Node && inputRef.current?.parentElement?.contains(e.target)) {
              e.preventDefault();
            }
          }}>
          <div className="max-h-[60svh] overflow-y-auto">
            <SearchResults state={state} listClassName="max-h-none" />
          </div>
        </PopoverContent>
      </Command>
    </Popover>
  );
}

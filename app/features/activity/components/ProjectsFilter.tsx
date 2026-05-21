import { Tooltip, TooltipContent, TooltipTrigger } from '@datum-cloud/activity-ui';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Input } from '@datum-cloud/datum-ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ComMiloapisResourcemanagerV1Alpha1Project } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { Layers, ChevronDown } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';

/** Badge type options available in datum-ui for project color chips. */
const CHIP_COLORS: Array<
  | 'primary'
  | 'secondary'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'tertiary'
  | 'quaternary'
> = [
  'primary',
  'info',
  'success',
  'warning',
  'danger',
  'tertiary',
  'quaternary',
  'muted',
  'secondary',
  // 10-slot palette: datum-ui exposes 9 distinct Badge types. Slot 9 intentionally
  // repeats 'primary' so a 10-way name-hash maps cleanly without modulus collapse.
  'primary',
];

/**
 * Deterministic color index derived from the project's metadata.name.
 * Uses a simple djb2-style hash so the same name always maps to the same
 * color slot, and that slot is stable across sessions.
 */
export function projectColorIndex(name: string): number {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  return Math.abs(hash) % CHIP_COLORS.length;
}

export function projectColor(
  name: string
):
  | 'primary'
  | 'secondary'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'tertiary'
  | 'quaternary' {
  return CHIP_COLORS[projectColorIndex(name)];
}

/** Derive display name consistent with the display-name convention used in search and dashboards. */
export function projectDisplayName(project: ComMiloapisResourcemanagerV1Alpha1Project): string {
  return (
    project.metadata?.annotations?.['kubernetes.io/display-name'] || project.metadata?.name || ''
  );
}

export interface ProjectsFilterProps {
  /** Full project list from useOrgProjectListQuery */
  projects: ComMiloapisResourcemanagerV1Alpha1Project[];
  /** Currently selected project metadata.names */
  selected: string[];
  /** Called with the next selected list when user toggles a project or clears all */
  onChange: (next: string[]) => void;
  /** Whether the project list is still loading (disables pill) */
  loading?: boolean;
  /** Maximum simultaneous selections (default 10) */
  maxSelection?: number;
}

/**
 * ProjectsFilter renders a pill button that opens a 280px-wide dropdown
 * checklist of org projects. Selected projects appear as removable tag chips
 * below the filter bar. The component is URL-unaware; the parent owns URL state.
 */
export function ProjectsFilter({
  projects,
  selected,
  onChange,
  loading = false,
  maxSelection = 10,
}: ProjectsFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isEmpty = !loading && projects.length === 0;
  const isDisabled = loading || isEmpty;

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const nameA = projectDisplayName(a).toLowerCase();
      const nameB = projectDisplayName(b).toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return (a.metadata?.name ?? '').localeCompare(b.metadata?.name ?? '');
    });
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return sortedProjects;
    const q = search.trim().toLowerCase();
    return sortedProjects.filter(
      (p) =>
        projectDisplayName(p).toLowerCase().includes(q) ||
        (p.metadata?.name ?? '').toLowerCase().includes(q)
    );
  }, [sortedProjects, search]);

  const handleToggle = useCallback(
    (projectName: string) => {
      if (selected.includes(projectName)) {
        onChange(selected.filter((n) => n !== projectName));
      } else if (selected.length < maxSelection) {
        onChange([...selected, projectName]);
      }
    },
    [selected, onChange, maxSelection]
  );

  const handleClearAll = useCallback(() => {
    onChange([]);
    setOpen(false);
  }, [onChange]);

  const pillLabel =
    selected.length > 0
      ? `${selected.length} of ${projects.length} project${projects.length !== 1 ? 's' : ''}`
      : 'Projects';

  const pillButton = (
    <Button
      type="secondary"
      theme="outline"
      size="small"
      className={cn(
        'h-9 gap-1.5 text-sm font-normal',
        isDisabled && 'cursor-not-allowed opacity-50'
      )}
      disabled={isDisabled}
      onClick={() => !isDisabled && setOpen((prev) => !prev)}
      aria-haspopup="listbox"
      aria-expanded={open}>
      <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{pillLabel}</span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
    </Button>
  );

  return (
    <div className="flex flex-col items-start gap-2">
        {/* Filter pill + dropdown */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {isDisabled ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">{pillButton}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {loading ? 'Loading projects…' : 'No projects in this organization'}
                </TooltipContent>
              </Tooltip>
            ) : (
              pillButton
            )}
          </PopoverTrigger>

          <PopoverContent
            className="w-[280px] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}>
            {/* Search input */}
            <div className="border-border border-b p-2">
              <Input
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-sm"
                aria-label="Search projects"
              />
            </div>

            {/* Scrollable checkbox list */}
            <ul
              role="listbox"
              aria-multiselectable="true"
              aria-label="Projects"
              className="max-h-60 overflow-y-auto py-1">
              {filteredProjects.length === 0 ? (
                <li className="text-muted-foreground px-3 py-2 text-sm">No projects found</li>
              ) : (
                filteredProjects.map((project) => {
                  const name = project.metadata?.name ?? '';
                  const displayName = projectDisplayName(project);
                  const isChecked = selected.includes(name);
                  const isAtCap = selected.length >= maxSelection && !isChecked;
                  const color = projectColor(name);

                  return (
                    <li
                      key={name}
                      role="option"
                      aria-selected={isChecked}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm',
                        isAtCap ? 'cursor-not-allowed opacity-40' : 'hover:bg-muted/50'
                      )}
                      onClick={() => !isAtCap && handleToggle(name)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isAtCap) {
                          e.preventDefault();
                          handleToggle(name);
                        }
                      }}
                      tabIndex={isAtCap ? -1 : 0}>
                      {/* Color dot */}
                      <span className="mt-0.5 shrink-0">
                        <Badge
                          type={color}
                          theme="solid"
                          className="h-2.5 w-2.5 rounded-full p-0"
                        />
                      </span>

                      {/* Label */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate leading-snug font-medium">{displayName}</span>
                        {displayName !== name && (
                          <span className="text-muted-foreground truncate font-mono text-xs leading-snug">
                            {name}
                          </span>
                        )}
                      </div>

                      <Checkbox
                        checked={isChecked}
                        disabled={isAtCap}
                        onCheckedChange={() => !isAtCap && handleToggle(name)}
                        aria-label={`Select ${displayName}`}
                        className="mt-0.5 shrink-0"
                        tabIndex={-1}
                      />
                    </li>
                  );
                })
              )}
            </ul>

            {/* Footer */}
            <div className="border-border flex items-center justify-between border-t px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className={cn(
                    'text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline',
                    selected.length === 0 && 'pointer-events-none opacity-40'
                  )}
                  onClick={handleClearAll}
                  disabled={selected.length === 0}
                  aria-disabled={selected.length === 0}>
                  Clear all
                </button>
                {selected.length >= maxSelection && (
                  <span className="text-muted-foreground text-xs">
                    Maximum {maxSelection} projects can be selected.
                  </span>
                )}
              </div>
              <span className="text-muted-foreground text-xs">{selected.length} selected</span>
            </div>
          </PopoverContent>
        </Popover>
    </div>
  );
}

import {
  applyRules,
  blankRule,
  emptyValue,
  isRuleComplete,
  OPERATORS,
  enumValues,
  VALUE_KIND,
  type EnumFilterField,
  type FilterField,
  type FilterOperator,
  type FilterRule,
  type FilterRuleSet,
} from '../../lib/filter-rules';
import { FilterOptionRow, optionSearchText } from './rich-filter-panel';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@datum-cloud/datum-ui/command';
import { Input } from '@datum-cloud/datum-ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Rule-based list filtering: `Where [field] [operator] [value]` rows joined by
 * one AND/OR switch, edited in a popover behind a `Filter (n) ×` button.
 * Unlike the sidebar/inline filters (one value per column in datum-ui's store),
 * rules can repeat a field and use operators, so `ListTable` applies them to
 * `data` itself via `applyRules` (lib/filter-rules) before handing rows to the table.
 */

// One look for every control in a rule row. datum-ui's SelectTrigger (min-h-10,
// font-medium, filled) and Input (h-10, rounded-lg) are sized for forms.
const controlClassName =
  'border-input-border h-8 min-h-8 rounded-md bg-transparent px-2.5 py-0 text-sm font-normal shadow-none';

/** Toolbar control: `Filter (n)` opens the rule editor; `×` clears every rule. */
export function RuleFilterButton<TData>({
  fields,
  data,
  value,
  onChange,
  disabled = false,
}: {
  fields: FilterField<TData>[];
  /** Unfiltered rows, for the value counts in enum pickers. */
  data: TData[];
  value: FilterRuleSet;
  onChange: (next: FilterRuleSet) => void;
  disabled?: boolean;
}) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const activeCount = value.rules.filter(isRuleComplete).length;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    // Start with a blank row so the editor never opens empty; drop unfinished
    // rows on close so the count matches what's actually filtering.
    if (next && value.rules.length === 0 && fields[0]) {
      onChange({ ...value, rules: [blankRule(fields[0] as FilterField<unknown>)] });
    } else if (!next) {
      onChange({ ...value, rules: value.rules.filter(isRuleComplete) });
    }
  };

  const updateRule = (id: string, patch: Partial<FilterRule>) =>
    onChange({
      ...value,
      rules: value.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });

  return (
    // Joined `Filter n | ×` pill once rules apply.
    <div className={cn('flex shrink-0 items-center rounded-md', activeCount > 0 && 'bg-muted')}>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            htmlType="button"
            type="secondary"
            theme="borderless"
            size="xs"
            disabled={disabled}
            className={cn(activeCount > 0 && 'rounded-r-none')}
            icon={<ACTION_ICONS.filter className="size-3.5" />}>
            {t`Filter`}
            {activeCount > 0 && (
              <Text
                as="span"
                size="xs"
                weight="medium"
                className="bg-background flex h-4 min-w-4 items-center justify-center rounded-full px-1 tabular-nums">
                {activeCount}
              </Text>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(44rem,calc(100vw-2rem))] p-3"
          // Don't land focus (and its ring) on the first select every open.
          onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="flex flex-col gap-2">
            {value.rules.map((rule, index) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                index={index}
                fields={fields}
                data={data}
                ruleSet={value}
                onConjunctionChange={(conjunction) => onChange({ ...value, conjunction })}
                onChange={(patch) => updateRule(rule.id, patch)}
                onRemove={() =>
                  onChange({ ...value, rules: value.rules.filter((r) => r.id !== rule.id) })
                }
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              htmlType="button"
              type="secondary"
              theme="borderless"
              size="xs"
              icon={<Plus className="size-3.5" />}
              onClick={() =>
                fields[0] &&
                onChange({
                  ...value,
                  rules: [...value.rules, blankRule(fields[0] as FilterField<unknown>)],
                })
              }>
              {t`Add filter`}
            </Button>
            {value.rules.length > 0 && (
              <Button
                htmlType="button"
                type="secondary"
                theme="borderless"
                size="xs"
                onClick={() => onChange({ ...value, rules: [] })}>
                {t`Clear all filters`}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {activeCount > 0 && (
        <Button
          htmlType="button"
          type="secondary"
          theme="borderless"
          size="icon"
          aria-label={t`Clear filters`}
          className="border-background size-7 rounded-l-none border-l"
          icon={<X className="size-3.5" />}
          onClick={() => onChange({ ...value, rules: [] })}
        />
      )}
    </div>
  );
}

function RuleRow<TData>({
  rule,
  index,
  fields,
  data,
  ruleSet,
  onConjunctionChange,
  onChange,
  onRemove,
}: {
  rule: FilterRule;
  index: number;
  fields: FilterField<TData>[];
  data: TData[];
  ruleSet: FilterRuleSet;
  onConjunctionChange: (conjunction: FilterRuleSet['conjunction']) => void;
  onChange: (patch: Partial<FilterRule>) => void;
  onRemove: () => void;
}) {
  const { t } = useLingui();
  const field = fields.find((f) => f.id === rule.field) ?? fields[0];
  if (!field) return null;

  const operatorLabels: Record<FilterOperator, string> = {
    contains: t`contains`,
    notContains: t`does not contain`,
    is: t`is`,
    isEmpty: t`is empty`,
    anyOf: t`is any of`,
    noneOf: t`is none of`,
    lastDays: t`in the last`,
    before: t`is before`,
    after: t`is after`,
    eq: t`equals`,
    gt: t`is greater than`,
    lt: t`is less than`,
  };
  const conjunctionLabel = ruleSet.conjunction === 'and' ? t`and` : t`or`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-16 shrink-0">
        {index === 0 ? (
          <Text size="sm" textColor="muted" className="pl-2">
            {t`Where`}
          </Text>
        ) : index === 1 ? (
          // Only the second row edits the conjunction; later rows echo it.
          <Select
            value={ruleSet.conjunction}
            onValueChange={(v) => onConjunctionChange(v as FilterRuleSet['conjunction'])}>
            <SelectTrigger className={cn(controlClassName, 'w-16 px-2')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">{t`and`}</SelectItem>
              <SelectItem value="or">{t`or`}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Text size="sm" textColor="muted" className="pl-2">
            {conjunctionLabel}
          </Text>
        )}
      </div>
      <Select
        value={field.id}
        onValueChange={(id) => {
          const next = fields.find((f) => f.id === id);
          if (!next) return;
          const op = OPERATORS[next.type][0];
          onChange({ field: next.id, op, value: emptyValue(op) });
        }}>
        <SelectTrigger className={cn(controlClassName, 'w-40')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={rule.op}
        onValueChange={(v) => {
          const op = v as FilterOperator;
          // Keep the value when the input stays the same shape (contains → is).
          onChange(VALUE_KIND[op] === VALUE_KIND[rule.op] ? { op } : { op, value: emptyValue(op) });
        }}>
        <SelectTrigger className={cn(controlClassName, 'w-40')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS[field.type].map((op) => (
            <SelectItem key={op} value={op}>
              {operatorLabels[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex min-w-40 flex-1 items-center gap-2">
        <RuleValueInput
          rule={rule}
          field={field}
          fields={fields}
          data={data}
          ruleSet={ruleSet}
          onChange={(value) => onChange({ value })}
        />
      </div>
      <Button
        htmlType="button"
        type="secondary"
        theme="borderless"
        size="icon"
        aria-label={t`Remove filter`}
        className="size-7 shrink-0"
        icon={<X className="size-3.5" />}
        onClick={onRemove}
      />
    </div>
  );
}

function RuleValueInput<TData>({
  rule,
  field,
  fields,
  data,
  ruleSet,
  onChange,
}: {
  rule: FilterRule;
  field: FilterField<TData>;
  fields: FilterField<TData>[];
  data: TData[];
  ruleSet: FilterRuleSet;
  onChange: (value: string | string[]) => void;
}) {
  const { t } = useLingui();

  switch (VALUE_KIND[rule.op]) {
    case 'none':
      return null;
    case 'list':
      return field.type === 'enum' ? (
        <EnumValuePicker
          rule={rule}
          field={field}
          fields={fields}
          data={data}
          ruleSet={ruleSet}
          onChange={onChange}
        />
      ) : null;
    case 'number':
      return (
        <Input
          type="number"
          value={rule.value as string}
          onChange={(e) => onChange(e.target.value)}
          className={cn(controlClassName, 'w-28')}
          autoFocus
        />
      );
    case 'days':
      return (
        <>
          <Input
            type="number"
            min={1}
            value={rule.value as string}
            onChange={(e) => onChange(e.target.value)}
            className={cn(controlClassName, 'w-20')}
            autoFocus
          />
          <Text size="sm" textColor="muted">
            {t`days`}
          </Text>
        </>
      );
    case 'date':
      return (
        <Input
          type="date"
          value={rule.value as string}
          onChange={(e) => onChange(e.target.value)}
          className={controlClassName}
        />
      );
    default:
      return (
        <Input
          value={rule.value as string}
          placeholder={field.label}
          onChange={(e) => onChange(e.target.value)}
          className={controlClassName}
          autoFocus
        />
      );
  }
}

/** Options shown at once; typing narrows the rest (some fields carry thousands). */
const MAX_VISIBLE_OPTIONS = 50;
const SEARCH_DEBOUNCE_MS = 300;

/** Multi-select over an enum field's options, with counts against the other rules. */
function EnumValuePicker<TData>({
  rule,
  field,
  fields,
  data,
  ruleSet,
  onChange,
}: {
  rule: FilterRule;
  field: EnumFilterField<TData>;
  fields: FilterField<TData>[];
  data: TData[];
  ruleSet: FilterRuleSet;
  onChange: (value: string[]) => void;
}) {
  const { t } = useLingui();
  const [query, setQuery] = useState('');
  const selected = rule.value as string[];
  const optionsByValue = useMemo(
    () => new Map(field.options.map((o) => [o.value, o])),
    [field.options]
  );
  const labels = selected.map((v) => optionsByValue.get(v)?.label ?? v);

  const { onSearchChange } = field;
  useEffect(() => {
    if (!onSearchChange) return;
    const timer = setTimeout(() => onSearchChange(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, onSearchChange]);

  // Under AND, count within the rows the other rules leave; under OR the other
  // rules only add rows, so count across everything.
  const counts = useMemo(() => {
    const base =
      ruleSet.conjunction === 'and'
        ? applyRules(
            data,
            { ...ruleSet, rules: ruleSet.rules.filter((r) => r.id !== rule.id) },
            fields
          )
        : data;
    const byKey = new Map(field.options.map((o) => [o.value.toLowerCase(), o.value]));
    const tally: Record<string, number> = {};
    for (const option of field.options) tally[option.value] = 0;
    for (const row of base) {
      for (const key of new Set(enumValues(row, field))) {
        const value = byKey.get(key);
        if (value !== undefined) tally[value]++;
      }
    }
    return tally;
  }, [data, ruleSet, rule.id, fields, field]);

  // Selected values first (even ones whose option hasn't loaded), then matches.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const picked = selected.map((v) => optionsByValue.get(v) ?? { value: v, label: v });
    const rest = field.options.filter(
      (o) => !selected.includes(o.value) && optionSearchText(o).toLowerCase().includes(q)
    );
    return [...picked, ...rest.slice(0, MAX_VISIBLE_OPTIONS)];
  }, [query, selected, optionsByValue, field.options]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <Popover onOpenChange={(open) => !open && setQuery('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            controlClassName,
            'hover:bg-muted/50 flex w-full min-w-0 items-center gap-1.5 border text-left transition-colors'
          )}>
          {labels.length > 0 ? (
            <>
              <span className="min-w-0 truncate">{labels[0]}</span>
              {labels.length > 1 && (
                <Text as="span" size="sm" textColor="muted">
                  +{labels.length - 1}
                </Text>
              )}
            </>
          ) : (
            <Text as="span" size="sm" textColor="muted">
              {t`Select...`}
            </Text>
          )}
          <ChevronDown className="text-muted-foreground ml-auto size-3.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        {/* Filtering is ours (cap + async options), not cmdk's. */}
        <Command shouldFilter={false}>
          <CommandInput placeholder={t`Search...`} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              {field.isSearching
                ? t`Searching...`
                : !query && field.emptyHint
                  ? field.emptyHint
                  : t`No results.`}
            </CommandEmpty>
            <CommandGroup>
              {visible.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggle(option.value)}>
                  {/* CommandItem greys any svg without a text-* class, which would
                      tint the checkbox tick muted; pin it back to the checked colour. */}
                  <Checkbox
                    checked={selected.includes(option.value)}
                    className="[&_svg]:!text-primary-foreground pointer-events-none shrink-0"
                  />
                  <FilterOptionRow option={option} counts={counts} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

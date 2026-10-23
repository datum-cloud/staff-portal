import type { FilterOption } from '../components/page/rich-filter-panel';

/**
 * Rule model + matcher behind `RuleFilterButton` (`Where field op value` rows
 * joined by one AND/OR). Kept free of React/i18n so it's unit-testable.
 */

interface FilterFieldBase<TData> {
  id: string;
  label: string;
  /** Dot-path into the row (e.g. `spec.email`) or a getter for derived values. */
  accessor: string | ((row: TData) => unknown);
}

/** Free text: contains / does not contain / is / is empty. */
export interface TextFilterField<TData> extends FilterFieldBase<TData> {
  type: 'text';
}

/**
 * Known values (statuses, decisions, orgs): is any of / is none of. The row
 * value may be an array (e.g. linked project ids) — it matches if any entry does.
 */
export interface EnumFilterField<TData> extends FilterFieldBase<TData> {
  type: 'enum';
  options: FilterOption[];
  /**
   * Debounced callback for async option loading (e.g. searching every org via
   * GraphQL); `options` should grow to include the results.
   */
  onSearchChange?: (query: string) => void;
  /** True while `onSearchChange` results are loading. */
  isSearching?: boolean;
  /** Shown when the search box is empty and there's nothing to browse. */
  emptyHint?: string;
}

/** Counts and scores: equals / greater than / less than. */
export interface NumberFilterField<TData> extends FilterFieldBase<TData> {
  type: 'number';
}

/** Timestamps: in the last N days / before / after. */
export interface DateFilterField<TData> extends FilterFieldBase<TData> {
  type: 'date';
}

export type FilterField<TData> =
  | TextFilterField<TData>
  | EnumFilterField<TData>
  | NumberFilterField<TData>
  | DateFilterField<TData>;

export type FieldType = FilterField<unknown>['type'];

export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'is'
  | 'isEmpty'
  | 'anyOf'
  | 'noneOf'
  | 'eq'
  | 'gt'
  | 'lt'
  | 'lastDays'
  | 'before'
  | 'after';

export interface FilterRule {
  id: string;
  field: string;
  op: FilterOperator;
  /** `string[]` for anyOf/noneOf; otherwise text, a number, a day count, or `YYYY-MM-DD`. */
  value: string | string[];
}

export interface FilterRuleSet {
  conjunction: 'and' | 'or';
  rules: FilterRule[];
}

export const EMPTY_RULE_SET: FilterRuleSet = { conjunction: 'and', rules: [] };

export const OPERATORS: Record<FieldType, FilterOperator[]> = {
  text: ['contains', 'notContains', 'is', 'isEmpty'],
  enum: ['anyOf', 'noneOf'],
  number: ['eq', 'gt', 'lt'],
  date: ['lastDays', 'before', 'after'],
};

/** What each operator's value input looks like; ops sharing a kind keep the value when switched. */
export const VALUE_KIND: Record<
  FilterOperator,
  'text' | 'list' | 'none' | 'number' | 'days' | 'date'
> = {
  contains: 'text',
  notContains: 'text',
  is: 'text',
  isEmpty: 'none',
  anyOf: 'list',
  noneOf: 'list',
  eq: 'number',
  gt: 'number',
  lt: 'number',
  lastDays: 'days',
  before: 'date',
  after: 'date',
};

const DAY_MS = 86_400_000;

let nextRuleId = 0;

export function blankRule(field: FilterField<unknown>): FilterRule {
  const op = OPERATORS[field.type][0];
  return { id: `rule-${nextRuleId++}`, field: field.id, op, value: emptyValue(op) };
}

export function emptyValue(op: FilterOperator): string | string[] {
  return VALUE_KIND[op] === 'list' ? [] : '';
}

/** `YYYY-MM-DD` → local midnight, so before/after follow the viewer's calendar day. */
function parseDay(value: string): number {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d).getTime();
}

/** Incomplete rules (no value yet) are ignored rather than matching nothing. */
export function isRuleComplete(rule: FilterRule): boolean {
  switch (VALUE_KIND[rule.op]) {
    case 'none':
      return true;
    case 'list':
      return (rule.value as string[]).length > 0;
    case 'number':
      return (rule.value as string).trim() !== '' && !Number.isNaN(Number(rule.value));
    case 'days':
      return Number(rule.value) > 0;
    case 'date':
      return !Number.isNaN(parseDay(rule.value as string));
    default:
      return (rule.value as string).trim() !== '';
  }
}

export function readField<TData>(row: TData, field: FilterField<TData>): unknown {
  if (typeof field.accessor === 'function') return field.accessor(row);
  return field.accessor
    .split('.')
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], row);
}

/** A row's value(s) for an enum field, lowercased; array-valued fields yield every entry. */
export function enumValues<TData>(row: TData, field: FilterField<TData>): string[] {
  const raw = readField(row, field);
  return (Array.isArray(raw) ? raw : [raw]).map((v) => String(v ?? '').toLowerCase());
}

function matchRule<TData>(row: TData, rule: FilterRule, field: FilterField<TData>): boolean {
  const raw = readField(row, field);

  if (field.type === 'number') {
    if (raw == null || raw === '') return false;
    const n = Number(raw);
    const target = Number(rule.value);
    if (Number.isNaN(n)) return false;
    return rule.op === 'gt' ? n > target : rule.op === 'lt' ? n < target : n === target;
  }

  if (field.type === 'date') {
    const time = raw ? new Date(raw as string).getTime() : NaN;
    if (Number.isNaN(time)) return false;
    if (rule.op === 'lastDays') return time >= Date.now() - Number(rule.value) * DAY_MS;
    const day = parseDay(rule.value as string);
    return rule.op === 'before' ? time < day : time >= day + DAY_MS;
  }

  // Case-insensitive throughout: enum values arrive as `Pending` or `ACCEPTED`.
  if (VALUE_KIND[rule.op] === 'list') {
    const cells = enumValues(row, field);
    const hit = (rule.value as string[]).some((v) => cells.includes(v.toLowerCase()));
    return rule.op === 'anyOf' ? hit : !hit;
  }
  const text = String(raw ?? '').toLowerCase();
  const query = (rule.value as string).trim().toLowerCase();
  switch (rule.op) {
    case 'contains':
      return text.includes(query);
    case 'notContains':
      return !text.includes(query);
    case 'is':
      return text === query;
    default:
      return text.trim() === '';
  }
}

/** Rows matching the complete rules, joined by the set's conjunction. */
export function applyRules<TData>(
  data: TData[],
  ruleSet: FilterRuleSet,
  fields: FilterField<TData>[]
): TData[] {
  const active = ruleSet.rules.flatMap((rule) => {
    const field = fields.find((f) => f.id === rule.field);
    return field && isRuleComplete(rule) ? [{ rule, field }] : [];
  });
  if (active.length === 0) return data;
  const test = ({ rule, field }: (typeof active)[number], row: TData) =>
    matchRule(row, rule, field);
  return data.filter((row) =>
    ruleSet.conjunction === 'and'
      ? active.every((a) => test(a, row))
      : active.some((a) => test(a, row))
  );
}

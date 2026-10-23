import { applyRules, type FilterField, type FilterRule, type FilterRuleSet } from './filter-rules';
import { describe, expect, test } from 'vitest';

interface Row {
  name: string;
  score?: number;
  projects?: string[];
  email?: string;
  status: { access: string };
  createdAt: string;
}

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

const rows: Row[] = [
  {
    name: 'Ada',
    score: 0.2,
    projects: ['p1', 'p2'],
    email: 'ada@datum.net',
    status: { access: 'Pending' },
    createdAt: daysAgo(2),
  },
  {
    name: 'Bo',
    score: 0.8,
    projects: ['p3'],
    email: 'bo@gmail.com',
    status: { access: 'Approved' },
    createdAt: daysAgo(40),
  },
  { name: 'Cy', email: '', status: { access: 'Rejected' }, createdAt: '2024-03-10T12:00:00' },
];

const fields: FilterField<Row>[] = [
  { id: 'name', label: 'Name', type: 'text', accessor: (row) => row.name },
  { id: 'email', label: 'Email', type: 'text', accessor: 'email' },
  { id: 'access', label: 'Access', type: 'enum', accessor: 'status.access', options: [] },
  { id: 'created', label: 'Created', type: 'date', accessor: 'createdAt' },
  { id: 'score', label: 'Score', type: 'number', accessor: 'score' },
  { id: 'projects', label: 'Projects', type: 'enum', accessor: 'projects', options: [] },
];

const names = (
  rules: Omit<FilterRule, 'id'>[],
  conjunction: FilterRuleSet['conjunction'] = 'and'
) =>
  applyRules(
    rows,
    { conjunction, rules: rules.map((r, i) => ({ ...r, id: String(i) })) },
    fields
  ).map((r) => r.name);

describe('applyRules', () => {
  test('text operators are case-insensitive', () => {
    expect(names([{ field: 'email', op: 'contains', value: 'DATUM' }])).toEqual(['Ada']);
    expect(names([{ field: 'email', op: 'notContains', value: 'datum' }])).toEqual(['Bo', 'Cy']);
    expect(names([{ field: 'name', op: 'is', value: 'bo' }])).toEqual(['Bo']);
    expect(names([{ field: 'email', op: 'isEmpty', value: '' }])).toEqual(['Cy']);
  });

  test('enum operators match any / none of the values', () => {
    expect(names([{ field: 'access', op: 'anyOf', value: ['pending', 'Approved'] }])).toEqual([
      'Ada',
      'Bo',
    ]);
    expect(names([{ field: 'access', op: 'noneOf', value: ['Pending'] }])).toEqual(['Bo', 'Cy']);
  });

  test('enum operators match any entry of an array value', () => {
    expect(names([{ field: 'projects', op: 'anyOf', value: ['P2'] }])).toEqual(['Ada']);
    expect(names([{ field: 'projects', op: 'noneOf', value: ['p3'] }])).toEqual(['Ada', 'Cy']);
  });

  test('number operators skip rows without a value', () => {
    expect(names([{ field: 'score', op: 'gt', value: '0.5' }])).toEqual(['Bo']);
    expect(names([{ field: 'score', op: 'lt', value: '0.5' }])).toEqual(['Ada']);
    expect(names([{ field: 'score', op: 'eq', value: '0.8' }])).toEqual(['Bo']);
  });

  test('date operators use day counts and local calendar days', () => {
    expect(names([{ field: 'created', op: 'lastDays', value: '7' }])).toEqual(['Ada']);
    expect(names([{ field: 'created', op: 'before', value: '2024-03-11' }])).toEqual(['Cy']);
    // "after" a day excludes that day itself.
    expect(names([{ field: 'created', op: 'after', value: '2024-03-10' }])).toEqual(['Ada', 'Bo']);
  });

  test('joins rules with and / or', () => {
    const rules: Omit<FilterRule, 'id'>[] = [
      { field: 'access', op: 'anyOf', value: ['Pending'] },
      { field: 'name', op: 'is', value: 'Bo' },
    ];
    expect(names(rules, 'and')).toEqual([]);
    expect(names(rules, 'or')).toEqual(['Ada', 'Bo']);
  });

  test('ignores incomplete rules instead of matching nothing', () => {
    expect(
      names([
        { field: 'name', op: 'contains', value: '  ' },
        { field: 'access', op: 'anyOf', value: [] },
        { field: 'created', op: 'lastDays', value: '' },
      ])
    ).toEqual(['Ada', 'Bo', 'Cy']);
  });
});

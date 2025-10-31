import { toBoolean, generateMetadataName, startCase } from './string.helper';
import { describe, expect, test } from 'vitest';

describe('string.helper', () => {
  describe('toBoolean', () => {
    test('returns same boolean for boolean inputs', () => {
      expect(toBoolean(true)).toBe(true);
      expect(toBoolean(false)).toBe(false);
    });

    test('parses string booleans case-insensitively', () => {
      expect(toBoolean('true')).toBe(true);
      expect(toBoolean('TRUE')).toBe(true);
      expect(toBoolean('TrUe')).toBe(true);
      expect(toBoolean('false')).toBe(false);
      expect(toBoolean('FALSE')).toBe(false);
    });

    test('returns false for undefined, null, and empty string', () => {
      expect(toBoolean(undefined)).toBe(false);
      expect(toBoolean(null)).toBe(false);
      expect(toBoolean('')).toBe(false);
    });

    test('returns false for non-boolean strings', () => {
      expect(toBoolean('yes' as unknown as string)).toBe(false);
      expect(toBoolean('no' as unknown as string)).toBe(false);
      expect(toBoolean('1' as unknown as string)).toBe(false);
      expect(toBoolean('0' as unknown as string)).toBe(false);
    });
  });

  describe('generateMetadataName', () => {
    test('generates name in the format {prefix}-{6chars}', () => {
      const prefix = 'cm715p';
      const name = generateMetadataName(prefix);
      expect(name).toMatch(new RegExp(`^${prefix}-[a-z0-9]{6}$`));
    });

    test('result is lowercase and contains only allowed characters', () => {
      const name = generateMetadataName('TeStPrefix');
      expect(name).toEqual(name.toLowerCase());
      expect(/^[a-z0-9-]+$/.test(name)).toBe(true);
    });

    test('produces different random suffixes across calls', () => {
      const a = generateMetadataName('abc');
      const b = generateMetadataName('abc');
      if (a === b) {
        const c = generateMetadataName('abc');
        expect(c === a && c === b).toBe(false);
      } else {
        expect(a).not.toEqual(b);
      }
    });

    test('does not exceed 63 characters', () => {
      const longPrefix = 'x'.repeat(80);
      const name = generateMetadataName(longPrefix);
      expect(name.length).toBeLessThanOrEqual(63);
    });
  });

  describe('startCase', () => {
    test('returns empty string for empty input', () => {
      expect(startCase('')).toBe('');
    });

    test('converts camelCase and PascalCase to Start Case', () => {
      expect(startCase('helloWorld')).toBe('Hello World');
      expect(startCase('HelloWorld')).toBe('Hello World');
    });

    test('handles snake_case and mixed separators', () => {
      expect(startCase('hello_world')).toBe('Hello World');
      expect(startCase('hello-world')).toBe('Hello World');
    });

    test('handles acronyms and numbers', () => {
      expect(startCase('userID')).toBe('User Id');
      expect(startCase('http2xx')).toBe('Http 2 Xx');
      expect(startCase('v1beta2')).toBe('V 1 Beta 2');
    });
  });
});

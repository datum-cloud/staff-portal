import { toBoolean, generateMetadataName, startCase } from '@/utils/helpers/string.helper';

describe('string.helper', () => {
  describe('toBoolean', () => {
    it('returns same boolean for boolean inputs', () => {
      expect(toBoolean(true)).to.equal(true);
      expect(toBoolean(false)).to.equal(false);
    });

    it('parses string booleans case-insensitively', () => {
      expect(toBoolean('true')).to.equal(true);
      expect(toBoolean('TRUE')).to.equal(true);
      expect(toBoolean('TrUe')).to.equal(true);
      expect(toBoolean('false')).to.equal(false);
      expect(toBoolean('FALSE')).to.equal(false);
    });

    it('returns false for undefined, null, and empty string', () => {
      expect(toBoolean(undefined)).to.equal(false);
      expect(toBoolean(null)).to.equal(false);
      expect(toBoolean('')).to.equal(false);
    });

    it('returns false for non-boolean strings', () => {
      expect(toBoolean('yes' as unknown as string)).to.equal(false);
      expect(toBoolean('no' as unknown as string)).to.equal(false);
      expect(toBoolean('1' as unknown as string)).to.equal(false);
      expect(toBoolean('0' as unknown as string)).to.equal(false);
    });
  });

  describe('generateMetadataName', () => {
    it('generates name in the format {prefix}-{6chars}', () => {
      const prefix = 'cm715p';
      const name = generateMetadataName(prefix);
      expect(name).to.match(new RegExp(`^${prefix}-[a-z0-9]{6}$`));
    });

    it('result is lowercase and contains only allowed characters', () => {
      const name = generateMetadataName('TeStPrefix');
      expect(name).to.equal(name.toLowerCase());
      expect(/^[a-z0-9-]+$/.test(name)).to.equal(true);
    });

    it('produces different random suffixes across calls', () => {
      const a = generateMetadataName('abc');
      const b = generateMetadataName('abc');
      if (a === b) {
        const c = generateMetadataName('abc');
        expect(c === a && c === b).to.equal(false);
      } else {
        expect(a).to.not.equal(b);
      }
    });

    it('does not exceed 63 characters', () => {
      const longPrefix = 'x'.repeat(80);
      const name = generateMetadataName(longPrefix);
      expect(name.length).to.be.at.most(63);
    });
  });

  describe('startCase', () => {
    it('returns empty string for empty input', () => {
      expect(startCase('')).to.equal('');
    });

    it('converts camelCase and PascalCase to Start Case', () => {
      expect(startCase('helloWorld')).to.equal('Hello World');
      expect(startCase('HelloWorld')).to.equal('Hello World');
    });

    it('handles snake_case and mixed separators', () => {
      expect(startCase('hello_world')).to.equal('Hello World');
      expect(startCase('hello-world')).to.equal('Hello World');
    });

    it('handles acronyms and numbers', () => {
      expect(startCase('userID')).to.equal('User Id');
      expect(startCase('http2xx')).to.equal('Http 2 Xx');
      expect(startCase('v1beta2')).to.equal('V 1 Beta 2');
    });
  });
});

import { parseSidebarState } from './sidebar';
import { describe, expect, it } from 'bun:test';

describe('parseSidebarState', () => {
  it('parses true', () => {
    expect(parseSidebarState('sidebar_state=true')).toBe(true);
  });

  it('parses false', () => {
    expect(parseSidebarState('sidebar_state=false')).toBe(false);
  });

  it('finds the cookie among others', () => {
    expect(parseSidebarState('lng=en; sidebar_state=true; theme=dark')).toBe(true);
  });

  it('tolerates whitespace around the separator', () => {
    expect(parseSidebarState('lng=en;  sidebar_state=true ; theme=dark')).toBe(true);
  });

  it('returns undefined for a null header', () => {
    expect(parseSidebarState(null)).toBeUndefined();
  });

  it('returns undefined for an undefined header', () => {
    expect(parseSidebarState(undefined)).toBeUndefined();
  });

  it('returns undefined when the cookie is absent', () => {
    expect(parseSidebarState('lng=en; theme=dark')).toBeUndefined();
  });

  it('returns undefined for an unrecognized value', () => {
    expect(parseSidebarState('sidebar_state=maybe')).toBeUndefined();
  });

  it('does not match a name that merely ends with sidebar_state', () => {
    expect(parseSidebarState('x_sidebar_state=true')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(parseSidebarState('')).toBeUndefined();
  });
});

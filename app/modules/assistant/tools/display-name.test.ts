import { projectDisplayName } from './display-name';
import { describe, expect, it } from 'bun:test';

describe('projectDisplayName', () => {
  it('prefers the display-name annotation', () => {
    expect(
      projectDisplayName({
        name: 'proj-abc',
        annotations: {
          'kubernetes.io/display-name': 'Renamed Project',
          'kubernetes.io/description': 'Original Name',
        },
      })
    ).toBe('Renamed Project');
  });

  it('falls back to description, which is where cloud-portal historically wrote the name', () => {
    expect(
      projectDisplayName({
        name: 'proj-abc',
        annotations: { 'kubernetes.io/description': 'Customer Project' },
      })
    ).toBe('Customer Project');
  });

  it('falls back to the resource name when neither annotation is set', () => {
    expect(projectDisplayName({ name: 'proj-abc', annotations: {} })).toBe('proj-abc');
  });

  it('falls through an empty display-name annotation', () => {
    expect(
      projectDisplayName({
        name: 'proj-abc',
        annotations: {
          'kubernetes.io/display-name': '',
          'kubernetes.io/description': 'Customer Project',
        },
      })
    ).toBe('Customer Project');
  });

  it('returns an empty string when there is no metadata at all', () => {
    expect(projectDisplayName(undefined)).toBe('');
  });
});

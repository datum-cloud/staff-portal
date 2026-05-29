import { parseK8sMessage } from './error-parser';
import { describe, expect, it } from 'vitest';

describe('parseK8sMessage', () => {
  it('returns empty for empty input', () => {
    expect(parseK8sMessage('')).toBe('');
  });

  it('passes through a plain message unchanged', () => {
    expect(parseK8sMessage('something went wrong')).toBe('something went wrong');
  });

  it('humanizes a standalone "not found" K8s path', () => {
    expect(parseK8sMessage('dnszones.dns.networking.miloapis.com "example" not found')).toBe(
      'DNS Zone "example" not found'
    );
  });

  it('falls back to raw kind when label is unknown', () => {
    expect(parseK8sMessage('widgets.example.com "x" not found')).toBe('widgets "x" not found');
  });

  it('strips admission webhook prefix and surfaces the deepest segment', () => {
    const raw =
      'admission webhook "vdomain-v1alpha.kb.io" denied the request: ' +
      'domains.networking.miloapis.com "example" is invalid: ' +
      'must be unique within the project';
    expect(parseK8sMessage(raw)).toBe('Must be unique within the project');
  });

  it('humanizes nested "not found"', () => {
    const raw =
      'admission webhook "x" denied the request: ' +
      'dnszones.dns.networking.miloapis.com "missing" not found';
    expect(parseK8sMessage(raw)).toBe('DNS Zone "missing" not found');
  });

  it('handles plain conflict-style messages', () => {
    expect(parseK8sMessage('contact already exists')).toBe('contact already exists');
  });

  it('uses AI Edge label for httpproxies', () => {
    expect(parseK8sMessage('httpproxies.networking.miloapis.com "edge-1" not found')).toBe(
      'AI Edge "edge-1" not found'
    );
  });
});

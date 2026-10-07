import { pluginBreadcrumbs } from './plugin-breadcrumbs';
import { describe, expect, it } from 'bun:test';

function projectPage(id: string, path: string) {
  return {
    type: 'portal.page/project',
    properties: { id, path, component: { $codeRef: id } },
  };
}

const plugin = {
  displayName: 'Workloads',
  manifest: {
    name: 'workloads.staff-portal.datumapis.com',
    version: '0.0.0',
    remoteEntry: 'remoteEntry.js',
    exposedModules: {},
    extensions: [
      projectPage('list', ''),
      projectPage('detail', ':workloadName'),
      projectPage('instance', ':workloadName/instances/:instanceName'),
    ],
  },
} as any;

const mount = '/customers/projects/p1/plugins/workloads';

describe('pluginBreadcrumbs', () => {
  it.each([
    ['the plugin index', '', [['Workloads', mount]]],
    [
      'a workload page',
      'web',
      [
        ['Workloads', mount],
        ['web', `${mount}/web`],
      ],
    ],
    [
      'an instance page, skipping the literal segment',
      'web/instances/web-0',
      [
        ['Workloads', mount],
        ['web', `${mount}/web`],
        ['web-0', `${mount}/web/instances/web-0`],
      ],
    ],
    [
      'an unknown path',
      'web/nope/x/y',
      [
        ['Workloads', mount],
        ['web', `${mount}/web`],
      ],
    ],
  ])('builds crumbs for %s', (_name, splat, expected) => {
    const items = pluginBreadcrumbs({ plugin, projectName: 'p1', slug: 'workloads', splat });
    expect(items.map((i) => [i.label, i.path])).toEqual(expected);
  });

  it('decodes encoded segments for display but keeps them encoded in the path', () => {
    const items = pluginBreadcrumbs({
      plugin,
      projectName: 'p1',
      slug: 'workloads',
      splat: 'a%20b',
    });
    expect(items[1]).toEqual({ label: 'a b', path: `${mount}/a%20b` });
  });
});

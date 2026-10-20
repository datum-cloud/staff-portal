import { mapGqlOrganization } from '@/resources/request/client/apis/organization.api';

type ProjectsInput =
  | { items?: Array<{ name: string }> | null; continueToken?: string | null }
  | null
  | undefined;

function orgWithProjects(projects: ProjectsInput) {
  return {
    name: 'org-1',
    displayName: 'Org One',
    type: 'Standard',
    contactInfo: { businessName: 'Acme', name: 'Ada', email: 'ada@example.com' },
    onboardingComplete: true,
    projects,
  };
}

describe('mapGqlOrganization projects', () => {
  it('keeps the project count unavailable when projects is null', () => {
    const org = mapGqlOrganization(orgWithProjects(null));

    expect(org.projectCount).to.be.null;
    expect(org.hasMoreProjects).to.be.null;
  });

  it('keeps the project count unavailable when projects is absent', () => {
    const org = mapGqlOrganization(orgWithProjects(undefined));

    expect(org.projectCount).to.be.null;
    expect(org.hasMoreProjects).to.be.null;
  });

  it('reports zero with no next page for an empty first page', () => {
    const org = mapGqlOrganization(orgWithProjects({ items: [], continueToken: null }));

    expect(org.projectCount).to.equal(0);
    expect(org.hasMoreProjects).to.equal(false);
  });

  it('reports the first-page count and whether another page exists', () => {
    const org = mapGqlOrganization(
      orgWithProjects({ items: [{ name: 'p1' }, { name: 'p2' }], continueToken: 'next' })
    );

    expect(org.projectCount).to.equal(2);
    expect(org.hasMoreProjects).to.equal(true);
  });
});

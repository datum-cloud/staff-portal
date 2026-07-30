// Fixture for the parsed chainsaw tests widget data (post useChainsawTests
// parseResponse — the shape the widget itself reads, not the raw API envelope).
const GITHUB_ACTIONS_URL =
  'https://github.com/datum-cloud/infra/actions/workflows/run-e2e-tests.yaml';

const now = 1761955200000; // fixed reference point so fixtures stay deterministic

function historyOf(pattern: boolean[]) {
  const stepMs = 2 * 60 * 60 * 1000;
  return pattern.map((passed, i) => ({
    timestamp: now - (pattern.length - 1 - i) * stepMs,
    passed,
  }));
}

function docsUrlFor(suite: string, test: string) {
  return `https://github.com/datum-cloud/infra/blob/main/tests/construct/${suite}/${test}/README.md`;
}

export const chainsawTestsFixture = {
  empty: {
    tests: [],
    githubActionsUrl: GITHUB_ACTIONS_URL,
  },

  allPassing: {
    tests: [
      {
        key: 'networking/dns-setup/prod',
        test: 'dns-setup',
        suite: 'networking',
        environment: 'prod',
        history: historyOf([true, true, true, true, true, true]),
        latest: { timestamp: now, passed: true },
        grafanaUrl:
          'https://grafana.prod.env.datum.net/d/chainsaw-e2e/chainsaw-e2e-tests?var-suite=networking&var-test=dns-setup',
        docsUrl: docsUrlFor('networking', 'dns-setup'),
      },
    ],
    githubActionsUrl: GITHUB_ACTIONS_URL,
  },

  mixed: {
    tests: [
      {
        key: 'networking/dns-setup/prod',
        test: 'dns-setup',
        suite: 'networking',
        environment: 'prod',
        history: historyOf([true, true, true, true, true, true]),
        latest: { timestamp: now, passed: true },
        grafanaUrl:
          'https://grafana.prod.env.datum.net/d/chainsaw-e2e/chainsaw-e2e-tests?var-suite=networking&var-test=dns-setup',
        docsUrl: docsUrlFor('networking', 'dns-setup'),
      },
      {
        key: 'health/api-health/prod',
        test: 'api-health',
        suite: 'health',
        environment: 'prod',
        history: historyOf([true, true, false, true, true, false]),
        latest: { timestamp: now, passed: false },
        grafanaUrl:
          'https://grafana.prod.env.datum.net/d/chainsaw-e2e/chainsaw-e2e-tests?var-suite=health&var-test=api-health',
        docsUrl: docsUrlFor('health', 'api-health'),
      },
    ],
    githubActionsUrl: GITHUB_ACTIONS_URL,
  },
};

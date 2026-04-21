import { createActivityTools } from './activity-tools';
import { createClusterTools } from './cluster-tools';
import { createCustomerTools } from './customer-tools';
import { createFraudTools } from './fraud-tools';
import { createMetricsTools } from './metrics-tools';
import { createResourceTools } from './resource-tools';
import { createSentryTools } from './sentry-tools';
import { createUtilityTools } from './utility-tools';

interface ToolDeps {
  accessToken: string;
}

export function createAssistantTools({ accessToken }: ToolDeps) {
  return {
    ...createCustomerTools({ accessToken }),
    ...createResourceTools({ accessToken }),
    ...createActivityTools({ accessToken }),
    ...createFraudTools({ accessToken }),
    ...createMetricsTools({ accessToken }),
    ...createSentryTools(),
    ...createClusterTools(),
    ...createUtilityTools(),
  };
}

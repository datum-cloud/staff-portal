import { metricsCreateMutation } from '../apis/metrics.api';
import { useQuery } from '@tanstack/react-query';

export const metricsQueryKeys = {
  all: ['metrics'] as const,
  projects: {
    all: (projectName: string) => ['metrics', 'projects', projectName] as const,
    secrets: (projectName: string) => ['metrics', 'projects', projectName, 'secrets'] as const,
  },
};

export const useProjectSecretMetricsQuery = (projectName: string) => {
  return useQuery({
    queryKey: metricsQueryKeys.projects.secrets(projectName),
    queryFn: () =>
      metricsCreateMutation({
        type: 'instant',
        query: `datum_cloud_core_secret_info{resourcemanager_datumapis_com_project_name="${projectName}"}`,
      }),
    enabled: Boolean(projectName),
    staleTime: 60 * 1000,
  });
};

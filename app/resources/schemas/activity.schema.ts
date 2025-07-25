import { createProxyResponseSchema } from './common.schema';
import { ActivityLogsResponseSchema } from '@/modules/loki';
import { z } from 'zod';

export const ProjectActivityListResponseSchema = createProxyResponseSchema(
  ActivityLogsResponseSchema
);
export type ProjectActivityListResponse = z.infer<typeof ProjectActivityListResponseSchema>;

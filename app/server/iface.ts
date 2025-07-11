import { RequestIdVariables } from 'hono/request-id';
import { SecureHeadersVariables } from 'hono/secure-headers';

export type EnvVariables = SecureHeadersVariables & RequestIdVariables;

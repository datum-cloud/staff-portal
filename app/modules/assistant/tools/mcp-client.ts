import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

let cached: { client: Client; connectedAt: number } | null = null;
const CLIENT_TTL_MS = 5 * 60 * 1000;

export async function getMcpClient(): Promise<Client | null> {
  if (!env.mcpUrl || !env.mcpApiKey) {
    logger.warn('MCP not configured', {
      hasUrl: !!env.mcpUrl,
      hasApiKey: !!env.mcpApiKey,
    });
    return null;
  }

  if (cached && Date.now() - cached.connectedAt < CLIENT_TTL_MS) {
    return cached.client;
  }

  try {
    const transport = new StreamableHTTPClientTransport(new URL(env.mcpUrl), {
      requestInit: {
        headers: { 'x-api-key': env.mcpApiKey },
      },
    });

    const client = new Client({ name: 'staff-portal-mcp', version: '1.0.0' });
    await client.connect(transport);

    cached = { client, connectedAt: Date.now() };
    return client;
  } catch (err) {
    logger.error('MCP connection failed', {
      url: env.mcpUrl,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return null;
  }
}

const MAX_RESULT_CHARS = 30_000;

function truncateContent(content: unknown): unknown {
  if (!Array.isArray(content)) return content;
  return content.map((item: any) => {
    if (
      item.type === 'text' &&
      typeof item.text === 'string' &&
      item.text.length > MAX_RESULT_CHARS
    ) {
      return {
        ...item,
        text: item.text.slice(0, MAX_RESULT_CHARS) + '\n\n… [truncated — response too large]',
      };
    }
    return item;
  });
}

export async function callMcpTool(toolName: string, args: Record<string, unknown>): Promise<any> {
  const client = await getMcpClient();
  if (!client) {
    return { error: 'MCP cluster is not configured or unreachable' };
  }

  try {
    const result = await client.callTool({ name: toolName, arguments: args });

    return { ...result, content: truncateContent(result.content) };
  } catch (err) {
    logger.error('MCP tool call failed', {
      toolName,
      args,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return {
      error: `MCP tool call failed: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

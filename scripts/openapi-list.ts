#!/usr/bin/env bun
/**
 * Script to list all available OpenAPI resources from the API server
 * Usage: bun scripts/openapi-list.ts [--api-url URL] [--token TOKEN]
 */
import { parseArgs } from 'util';

const args = parseArgs({
  options: {
    'api-url': {
      type: 'string',
      default: process.env.API_URL || 'https://api.staging.env.datum.net',
    },
    token: {
      type: 'string',
      default: process.env.API_TOKEN || '',
    },
  },
});

const API_URL = args.values['api-url'] as string;
const TOKEN = args.values.token as string;

if (!TOKEN) {
  console.error('Error: API token is required. Set API_TOKEN env var or use --token flag.');
  process.exit(1);
}

async function fetchRootOpenAPI() {
  const url = `${API_URL}/openapi/v3`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

async function main() {
  try {
    console.log(`Fetching OpenAPI resources from ${API_URL}...\n`);
    const rootOpenAPI = await fetchRootOpenAPI();

    // Extract all API paths
    const paths = rootOpenAPI.paths || {};
    const apiPaths = Object.keys(paths)
      .filter((path) => path.startsWith('apis/'))
      .filter((path) => !path.endsWith('/')) // Filter out group-only paths (e.g., "apis/notification.miloapis.com")
      .sort();

    console.log('Available OpenAPI Resources:\n');
    console.log('Format: apis/{group}/{version}');
    console.log('─'.repeat(60));

    const resources: Array<{ path: string; url: string; hash?: string }> = [];

    for (const path of apiPaths) {
      const pathInfo = paths[path];
      if (pathInfo?.serverRelativeURL) {
        const fullUrl = `${API_URL}${pathInfo.serverRelativeURL}`;
        const url = new URL(fullUrl);
        const hash = url.searchParams.get('hash') || undefined;

        resources.push({
          path,
          url: fullUrl,
          hash,
        });

        console.log(`  ${path}`);
        if (hash) {
          console.log(`    Hash: ${hash.substring(0, 16)}...`);
        }
      }
    }

    console.log('\n─'.repeat(60));
    console.log(`\nTotal: ${resources.length} resources found\n`);

    // Save to a JSON file for the generator script
    const configPath = './openapi-resources.json';
    await Bun.write(configPath, JSON.stringify(resources, null, 2));
    console.log(`Resources list saved to: ${configPath}`);
    console.log('\nTo generate TypeScript for specific resources, use:');
    console.log('  bun scripts/openapi-generate.ts --resources notification.miloapis.com/v1alpha1');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

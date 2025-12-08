// #!/usr/bin/env bun
/**
 * Generate API client using @hey-api/openapi-ts for multiple resources
 *
 * Features:
 * - Generates shared core/client from first resource
 * - Subsequent resources use shared core/client (no duplication)
 * - Rewrites imports automatically
 */
import { $ } from 'bun';
import fs from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { parseArgs } from 'util';

const args = parseArgs({
  options: {
    resources: { type: 'string', multiple: true },
    'api-url': { type: 'string', default: process.env.API_URL ?? '' },
    token: { type: 'string', default: process.env.API_TOKEN ?? '' },
    'output-dir': { type: 'string', default: './app/resources/openapi' },
  },
});

const {
  resources: RESOURCES,
  'api-url': API_URL,
  token: TOKEN,
  'output-dir': OUTPUT_DIR,
} = args.values;

if (!API_URL || !TOKEN || !RESOURCES?.length) {
  console.error(
    'Usage: bun generate-heyapi.ts --api-url <url> --token <token> --resources group/name/v1... '
  );
  process.exit(1);
}

function log(...v: any[]) {
  console.log(...v);
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function fetchSpec(resource: string) {
  const rootResp = await fetch(`${API_URL}/openapi/v3`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!rootResp.ok) throw new Error(`Root fetch failed: ${rootResp.status}`);
  const root = await rootResp.json();
  const fullPath = `apis/${resource}`;
  const entry = root.paths?.[fullPath];
  if (!entry?.serverRelativeURL) throw new Error(`Resource not found: ${fullPath}`);
  const specUrl = `${API_URL}${entry.serverRelativeURL}`;
  log('Fetching spec:', specUrl);
  const resp = await fetch(specUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!resp.ok) throw new Error(`Spec fetch failed: ${resp.status}`);
  return resp.json();
}

/**
 * Add ProxyResponse type and server helper to shared core types
 */
async function addProxyResponseToSharedCore(sharedDir: string) {
  const { readFile, writeFile } = await import('fs/promises');
  const coreTypesFile = path.join(sharedDir, 'core', 'types.gen.ts');

  if (!fs.existsSync(coreTypesFile)) {
    return;
  }

  let content = await readFile(coreTypesFile, 'utf8');

  // Add ProxyResponse type and server helper if not exists
  if (!content.includes('ProxyResponse')) {
    const proxyTypeDef = `
// Proxy response wrapper type - matches internal proxy response structure
// Used for client-side requests that go through /api/internal proxy
// Server-side requests don't use this wrapper
export type ProxyResponse<T> = {
  code: string;
  data: T;
  path: string;
  requestId?: string;
};

// Helper type to unwrap ProxyResponse if present, otherwise return T as-is
export type UnwrapProxyResponse<T> = T extends ProxyResponse<infer U> ? U : T;
`;

    // Insert at the end of the file
    content = content.trimEnd() + '\n' + proxyTypeDef;
    await writeFile(coreTypesFile, content, 'utf8');
    log(`  ✓ Added ProxyResponse and withServerAuth to shared core types`);
  }
}

/**
 * Wrap response types with proxy response structure (client-side only)
 * The internal proxy wraps responses as: { code, data, path, requestId }
 * Server-side requests don't have this wrapper, so we make it optional
 *
 * Note: This wraps types for client-side usage. For server-side, you can use
 * UnwrapProxyResponse<T> helper or access response.data directly
 */
async function wrapResponseTypes(resourceDir: string, sharedDir: string) {
  const { readFile, writeFile } = await import('fs/promises');
  const typesFile = path.join(resourceDir, 'types.gen.ts');

  if (!fs.existsSync(typesFile)) {
    return;
  }

  let content = await readFile(typesFile, 'utf8');

  // Import ProxyResponse and UnwrapProxyResponse from shared core
  if (!content.includes('ProxyResponse')) {
    const relativePath = path.relative(resourceDir, sharedDir);
    const importPath = relativePath.replace(/\\/g, '/');
    const importStatement = `import type { ProxyResponse, UnwrapProxyResponse } from '${importPath}/core/types.gen';\n`;
    // Insert after the first line (after the auto-generated comment)
    const firstLineEnd = content.indexOf('\n') + 1;
    content = content.slice(0, firstLineEnd) + importStatement + content.slice(firstLineEnd);
  }

  // Wrap *Responses types: wrap the value types inside the object
  // Pattern: export type XxxResponses = { 200: SomeType; 404: OtherType; };
  // Should become: export type XxxResponses = { 200: ProxyResponse<SomeType>; 404: ProxyResponse<OtherType>; };
  content = content.replace(
    /export type (\w+Responses) = \{([\s\S]*?)\};/g,
    (match, typeName, body) => {
      // Wrap each value type in the object with ProxyResponse
      const wrappedBody = body.replace(
        /(\d+):\s*([^;]+);/g,
        (statusMatch: string, statusCode: string, valueType: string) => {
          const trimmedType = valueType.trim();
          // Only wrap if not already wrapped
          if (!trimmedType.includes('ProxyResponse')) {
            return `${statusCode}: ProxyResponse<${trimmedType}>;`;
          }
          return statusMatch;
        }
      );
      return `export type ${typeName} = {${wrappedBody}};`;
    }
  );

  // Update *Response types to extract from ProxyResponse
  // Pattern: export type XxxResponse = XxxResponses[keyof XxxResponses];
  // Should become: export type XxxResponse = XxxResponses[keyof XxxResponses]['data'];
  // This extracts the actual data from the ProxyResponse wrapper
  content = content.replace(
    /export type (\w+Response) = (\w+Responses)\[keyof \2\];/g,
    (match, responseType, responsesType) => {
      // Extract data from ProxyResponse wrapper
      // For client-side: response.data.data gives the actual API response
      // For server-side: response.data gives the actual API response (no wrapper)
      return `export type ${responseType} = ${responsesType}[keyof ${responsesType}]['data'];`;
    }
  );

  await writeFile(typesFile, content, 'utf8');
  log(`  ✓ Wrapped response types with ProxyResponse (client-side)`);
}

async function generateClientForSpec(specFile: string, outDir: string) {
  await ensureDir(outDir);

  await $`bunx openapi-ts \
    -i ${specFile} \
    -o ${outDir} \
    -c @hey-api/client-axios`.quiet();

  log(`Generated client at ${outDir}`);

  // Wrap response types with proxy structure (for client-side)
  const sharedDir = path.join(path.dirname(path.dirname(outDir)), 'shared');
  await wrapResponseTypes(outDir, sharedDir);
}

/**
 * Remove local core and client folders from a resource directory
 */
async function cleanupLocalFolders(resourceDir: string) {
  const { rm } = await import('fs/promises');
  const coreDir = path.join(resourceDir, 'core');
  const clientDir = path.join(resourceDir, 'client');

  if (fs.existsSync(coreDir)) {
    await rm(coreDir, { recursive: true, force: true });
    log('  ✓ Removed local core folder');
  }

  if (fs.existsSync(clientDir)) {
    await rm(clientDir, { recursive: true, force: true });
    log('  ✓ Removed local client folder');
  }
}

/**
 * Extract shared core/client/client.gen.ts from first resource to shared folder
 * and update the first resource to use shared imports
 */
async function extractSharedCore(firstResourceDir: string, sharedDir: string) {
  const sharedCoreDir = path.join(sharedDir, 'core');
  const sharedClientDir = path.join(sharedDir, 'client');
  const { rm, readFile, writeFile } = await import('fs/promises');

  // Check if shared already exists
  if (fs.existsSync(sharedCoreDir)) {
    log('✓ Shared core/client already exists, skipping extraction');
    // Still update the first resource to use shared
    await updateImportsToShared(firstResourceDir, sharedDir);
    await removeLocalClientGen(firstResourceDir, sharedDir);
    // Remove local core and client folders even if shared already exists
    await cleanupLocalFolders(firstResourceDir);
    return;
  }

  await ensureDir(sharedCoreDir);
  await ensureDir(sharedClientDir);

  // Copy core and client from first resource
  const firstCoreDir = path.join(firstResourceDir, 'core');
  const firstClientDir = path.join(firstResourceDir, 'client');
  const firstClientGenFile = path.join(firstResourceDir, 'client.gen.ts');

  if (fs.existsSync(firstCoreDir)) {
    await $`cp -r ${firstCoreDir}/* ${sharedCoreDir}/`.quiet();
    log('✓ Extracted shared core');
  }

  if (fs.existsSync(firstClientDir)) {
    await $`cp -r ${firstClientDir}/* ${sharedClientDir}/`.quiet();
    log('✓ Extracted shared client');
  }

  // Add ProxyResponse type to shared core
  await addProxyResponseToSharedCore(sharedDir);

  // Copy client.gen.ts to shared and make it generic (use any instead of resource-specific types)
  if (fs.existsSync(firstClientGenFile)) {
    let content = await readFile(firstClientGenFile, 'utf8');
    // Update import to use shared client
    content = content.replace(/from ['"]\.\/client['"]/g, `from './client'`);
    // Remove resource-specific type import and use 'any' instead
    content = content.replace(
      /import type \{ ClientOptions as ClientOptions2 \} from ['"].*types\.gen['"];?\n/g,
      ''
    );
    // Replace ClientOptions2 with 'any' to make it generic
    content = content.replace(/ClientOptions2/g, 'any');
    const sharedClientGenFile = path.join(sharedDir, 'client.gen.ts');
    await writeFile(sharedClientGenFile, content, 'utf8');
    log('✓ Extracted shared client.gen.ts (generic with any)');

    // Set throwOnError default to true in client
    await setClientThrowOnErrorDefault(sharedDir);
  }

  // Now update the first resource to use shared imports
  await updateImportsToShared(firstResourceDir, sharedDir);
  await removeLocalClientGen(firstResourceDir, sharedDir);
  // Remove local core and client folders from first resource
  await cleanupLocalFolders(firstResourceDir);
}

/**
 * Update imports in a resource directory to point to shared core/client
 */
async function updateImportsToShared(resourceDir: string, sharedDir: string) {
  const { readFile, writeFile, readdir } = await import('fs/promises');

  // Rewrite imports in all TypeScript files
  const files = await readdir(resourceDir, { recursive: true });
  for (const file of files) {
    if (!file.endsWith('.ts')) continue;

    const filePath = path.join(resourceDir, file);
    const fileDir = path.dirname(filePath);

    // Calculate relative path from this specific file's directory to shared
    const relativePath = path.relative(fileDir, sharedDir);
    const importPath = relativePath.replace(/\\/g, '/'); // Normalize for imports

    let content = await readFile(filePath, 'utf8');
    let modified = false;

    // Replace imports to core (various patterns)
    if (content.includes('./core/') || content.includes('../core/')) {
      content = content.replace(/from ['"]\.\/core\//g, `from '${importPath}/core/`);
      content = content.replace(/from ['"]\.\.\/core\//g, `from '${importPath}/core/`);
      modified = true;
    }

    // Replace imports to client (various patterns)
    if (content.includes('./client') || content.includes('../client')) {
      content = content.replace(
        /from ['"]\.\/client\.gen['"]/g,
        `from '${importPath}/client/client.gen'`
      );
      content = content.replace(
        /from ['"]\.\/client\/client\.gen['"]/g,
        `from '${importPath}/client/client.gen'`
      );
      content = content.replace(/from ['"]\.\/client\//g, `from '${importPath}/client/`);
      content = content.replace(/from ['"]\.\.\/client\//g, `from '${importPath}/client/`);
      // Handle './client' (without trailing slash or .gen)
      content = content.replace(/from ['"]\.\/client['"]/g, `from '${importPath}/client'`);
      modified = true;
    }

    if (modified) {
      await writeFile(filePath, content, 'utf8');
    }
  }
}

/**
 * Remove local client.gen.ts and update imports in sdk.gen.ts to use shared
 */
async function removeLocalClientGen(resourceDir: string, sharedDir: string) {
  const { rm, readFile, writeFile } = await import('fs/promises');
  const clientGenFile = path.join(resourceDir, 'client.gen.ts');
  const sdkGenFile = path.join(resourceDir, 'sdk.gen.ts');

  // Remove local client.gen.ts
  if (fs.existsSync(clientGenFile)) {
    await rm(clientGenFile, { force: true });
  }

  // Update sdk.gen.ts to import from shared client.gen.ts
  if (fs.existsSync(sdkGenFile)) {
    const relativePath = path.relative(resourceDir, sharedDir);
    const importPath = relativePath.replace(/\\/g, '/');

    let content = await readFile(sdkGenFile, 'utf8');
    // Replace import from './client.gen' to shared
    content = content.replace(/from ['"]\.\/client\.gen['"]/g, `from '${importPath}/client.gen'`);
    // Also replace if it's already pointing to shared/client/client.gen (old path)
    content = content.replace(
      /from ['"].*shared\/client\/client\.gen['"]/g,
      `from '${importPath}/client.gen'`
    );
    await writeFile(sdkGenFile, content, 'utf8');
  }
}

/**
 * Remove core/client folders and rewrite imports to use shared
 */
async function sharedCore(resourceDir: string, sharedDir: string) {
  // Remove local core and client folders
  await cleanupLocalFolders(resourceDir);

  // Update imports to use shared
  await updateImportsToShared(resourceDir, sharedDir);
  await removeLocalClientGen(resourceDir, sharedDir);

  log(`  ✓ Updated imports to use shared core/client`);
}

/**
 * Set throwOnError default to true in generated SDK functions
 * This improves type inference so TypeScript knows response.data is always defined
 */
async function setThrowOnErrorDefault(resourceDir: string) {
  const { readFile, writeFile } = await import('fs/promises');
  const sdkGenFile = path.join(resourceDir, 'sdk.gen.ts');

  if (!fs.existsSync(sdkGenFile)) {
    return;
  }

  let content = await readFile(sdkGenFile, 'utf8');

  // Change default ThrowOnError from false to true
  // Pattern: ThrowOnError extends boolean = false
  // Replace with: ThrowOnError extends boolean = true
  const modified = content.replace(
    /ThrowOnError extends boolean = false/g,
    'ThrowOnError extends boolean = true'
  );

  if (modified !== content) {
    await writeFile(sdkGenFile, modified, 'utf8');
    log(`  ✓ Set throwOnError default to true in SDK`);
  }
}

/**
 * Set throwOnError default to true in generated client.gen.ts
 * This sets the runtime default so throwOnError is true even without setConfig()
 */
async function setClientThrowOnErrorDefault(sharedDir: string) {
  const { readFile, writeFile } = await import('fs/promises');
  const clientGenFile = path.join(sharedDir, 'client.gen.ts');

  if (!fs.existsSync(clientGenFile)) {
    return;
  }

  let content = await readFile(clientGenFile, 'utf8');

  // Change createConfig<any>() to createConfig<any>({ throwOnError: true })
  // Pattern: createClient(createConfig<any>())
  // Replace with: createClient(createConfig<any>({ throwOnError: true }))
  const modified = content.replace(
    /createClient\(createConfig<any>\(\)\)/g,
    'createClient(\n  createConfig<any>({\n    throwOnError: true,\n  })\n)'
  );

  if (modified !== content) {
    await writeFile(clientGenFile, modified, 'utf8');
    log(`  ✓ Set throwOnError default to true in client`);
  }
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const tempDir = '.openapi-temp';
  await ensureDir(tempDir);

  const sharedDir = path.join(OUTPUT_DIR, 'shared');
  const sharedCoreDir = path.join(sharedDir, 'core');
  // If shared already exists, treat all resources as subsequent (remove their local folders)
  const sharedExists = fs.existsSync(sharedCoreDir);
  let isFirstResource = !sharedExists;

  for (const res of RESOURCES || []) {
    const [group, version] = res.split('/');
    if (!group || !version) {
      console.warn('Invalid resource:', res);
      continue;
    }

    try {
      const spec = await fetchSpec(res);
      const specPath = path.join(tempDir, `${group}-${version}.json`);
      await writeFile(specPath, JSON.stringify(spec, null, 2), 'utf8');

      const outDir = path.join(OUTPUT_DIR, group, version);
      await generateClientForSpec(specPath, outDir);

      // Post-process SDK to set throwOnError default to true
      await setThrowOnErrorDefault(outDir);

      if (isFirstResource) {
        // Extract shared core/client from first resource
        await extractSharedCore(outDir, sharedDir);
        isFirstResource = false;
      } else {
        // Use shared core/client for subsequent resources
        await sharedCore(outDir, sharedDir);
      }
    } catch (e: any) {
      console.error(`Failed for resource ${res}:`, e.message);
    }
  }

  console.log('✅ Done');
}

main();

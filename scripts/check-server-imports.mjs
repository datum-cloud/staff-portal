#!/usr/bin/env node
// Resolves every bare import in the server bundle against the
// node_modules next to it, the way Node will at startup in the image.
//
// Run it from a production install (`npm ci --omit=dev`) with `build/`
// copied in. A package that is only reachable through the dev tree, or
// only nested under another package, fails here instead of in prod.
// Bundler plugins that inline a dependency (ssr.noExternal) move that
// dependency's own imports to the bundle's location, which is how
// v0.31.0 lost `ajv`.
//
// Nothing is executed: Node's ESM resolver runs on each specifier from
// a probe module inside the bundle directory, so no env vars are needed.
//
// Usage: node scripts/check-server-imports.mjs <server-build-dir>
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const STATIC_IMPORT = /^\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/gm;
const SIDE_EFFECT_IMPORT = /^\s*import\s*["']([^"']+)["']/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

const serverDir = path.resolve(process.argv[2] ?? 'build/server');

function listJsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

function isBare(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  if (specifier.startsWith('node:') || specifier.includes('://')) return false;
  return !builtinModules.includes(specifier.split('/')[0]);
}

function collectBareImports(files) {
  const importers = new Map();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of [STATIC_IMPORT, SIDE_EFFECT_IMPORT, DYNAMIC_IMPORT]) {
      for (const [, specifier] of source.matchAll(pattern)) {
        if (!isBare(specifier)) continue;
        const list = importers.get(specifier) ?? [];
        importers.set(specifier, [...list, path.relative(serverDir, file)]);
      }
    }
  }
  return importers;
}

// import.meta.resolve only takes a parent URL behind a flag, so resolve
// from a throwaway module that sits inside the bundle directory.
async function resolveFromBundle(specifiers) {
  const probe = path.join(serverDir, `.resolve-probe-${process.pid}.mjs`);
  writeFileSync(
    probe,
    `export const resolve = (s) => { try { import.meta.resolve(s); return null; } catch (e) { return e.code ?? e.message; } };\n`
  );
  try {
    const { resolve } = await import(pathToFileURL(probe).href);
    return specifiers.map((specifier) => ({ specifier, error: resolve(specifier) }));
  } finally {
    rmSync(probe, { force: true });
  }
}

const importers = collectBareImports(listJsFiles(serverDir));
const results = await resolveFromBundle([...importers.keys()].sort());
const failures = results.filter((r) => r.error);

if (failures.length > 0) {
  console.error(
    `Server bundle imports ${failures.length} package(s) the production install cannot resolve:\n`
  );
  for (const { specifier, error } of failures) {
    console.error(
      `  ${specifier} (${error}), imported by ${[...new Set(importers.get(specifier))].join(', ')}`
    );
  }
  console.error(
    '\nDeclare each one in package.json "dependencies" so it is installed at the top level.'
  );
  process.exit(1);
}

console.log(`All ${results.length} bare imports in ${serverDir} resolve.`);

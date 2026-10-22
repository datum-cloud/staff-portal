/**
 * Development Entry Point
 *
 * This script initializes observability services before starting the development server.
 * It uses the factory pattern for clean, extensible observability management.
 */
/* global process */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/**
 * Start the React Router development server
 */
async function startDevServer() {
  console.log('🌐 Starting React Router development server...');

  const viteBin = join(
    dirname(createRequire(import.meta.url).resolve('vite/package.json')),
    'bin/vite.js'
  );
  const devProcess = spawn(process.execPath, [viteBin], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: { ...process.env },
  });

  const exitCode = await new Promise((resolve) => {
    devProcess.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
  if (exitCode !== 0) {
    console.error(`❌ Development server exited with code ${exitCode}`);
    process.exit(exitCode);
  }
}

/**
 * Load and start the development server
 */
function loadAndStartDevServer() {
  return startDevServer();
}

try {
  // Load observability services first
  console.log('📊 Loading observability services...');

  import('./index.ts')
    .then(async (observabilityModule) => {
      try {
        // Initialize observability with all providers
        const results = await observabilityModule.initializeObservability();
        console.log('📊 Observability initialization results:', results);
      } catch (observabilityError) {
        console.warn(
          '⚠️ Observability initialization failed, continuing without observability:',
          observabilityError?.message || observabilityError
        );
      }

      return loadAndStartDevServer();
    })
    .catch((error) => {
      console.error('❌ Error loading observability module:', error);
      // Continue with server startup even if observability fails
      console.log('⚠️ Starting development server without observability...');
      return loadAndStartDevServer();
    });
} catch (error) {
  console.error('❌ Error in development startup script:', error);
  process.exit(1);
}

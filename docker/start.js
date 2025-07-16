/**
 * Docker Entry Point
 *
 * This script initializes OpenTelemetry instrumentation before starting the application.
 * It's designed specifically for the Docker/Bun environment.
 */

/* global process */

console.log('🚀 Starting application in Docker environment...');

/**
 * Start the Bun server with the given module
 */
function startServer(module) {
  // Check if we have a Bun server with fetch method
  if (typeof module.default.fetch === 'function') {
    console.log(`🌐 Starting Bun server on port ${module.default.port}`);
    Bun.serve({
      port: module.default.port,
      fetch: module.default.fetch,
      development: module.default.development,
    });
    console.log(`✅ Server started successfully on port ${module.default.port}`);
  } else {
    console.log(`⚠️ Server object does not have fetch method, assuming it's already running`);
    console.log(`✅ Server started successfully on port ${module.default.port}`);
  }
}

/**
 * Load and start the server
 */
function loadAndStartServer() {
  console.log('⏳ Starting server...');
  return import('../build/server/index.js').then(startServer).catch((error) => {
    console.error('❌ Error loading server:', error);
    process.exit(1);
  });
}

try {
  // Load OpenTelemetry first
  console.log('📊 Loading OpenTelemetry instrumentation...');
  import('./otel.ts')
    .then(async (otelModule) => {
      try {
        // Initialize OpenTelemetry manually
        const isOtelInitialized = await otelModule.initializeOtel();
        if (isOtelInitialized) {
          console.log('✅ OpenTelemetry loaded successfully');
        }
      } catch (otelError) {
        console.warn(
          '⚠️ OpenTelemetry initialization failed, continuing without telemetry:',
          otelError?.message || otelError
        );
      }
      return loadAndStartServer();
    })
    .catch((error) => {
      console.error('❌ Error loading OpenTelemetry:', error);
      // Continue with server startup even if OpenTelemetry fails
      console.log('⚠️ Starting server without OpenTelemetry...');
      return loadAndStartServer();
    });
} catch (error) {
  console.error('❌ Error in startup script:', error);
  process.exit(1);
}

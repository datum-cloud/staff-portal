/**
 * Docker Entry Point
 *
 * This script initializes OpenTelemetry instrumentation before starting the application.
 * It's designed specifically for the Docker/Bun environment.
 */

/* global process */

console.log('Starting application in Docker environment...');

try {
  // Load OpenTelemetry first
  console.log('Loading OpenTelemetry instrumentation...');
  import('./otel.ts')
    .then(() => {
      console.log('OpenTelemetry loaded successfully');

      // Then load the server
      console.log('Starting server...');
      import('./build/server/index.js')
        .then(async (module) => {
          console.log('Server module loaded:', {
            port: module.default.port,
            development: module.default.development,
            hasFetch: typeof module.default.fetch === 'function',
          });

          // Check if we have a Bun server with fetch method
          if (typeof module.default.fetch === 'function') {
            console.log('Starting Bun server on port', module.default.port);
            Bun.serve({
              port: module.default.port,
              fetch: module.default.fetch,
              development: module.default.development,
            });
            console.log('Server started successfully on port', module.default.port);
          } else {
            console.log("Server object does not have fetch method, assuming it's already running");
            console.log('Server started successfully on port', module.default.port);
          }
        })
        .catch((error) => {
          console.error('Error loading server:', error);
          process.exit(1);
        });
    })
    .catch((error) => {
      console.error('Error loading OpenTelemetry:', error);
      // Continue with server startup even if OpenTelemetry fails
      console.log('Starting server without OpenTelemetry...');
      import('./build/server/index.js')
        .then((module) => {
          console.log('Server module loaded:', {
            port: module.default.port,
            development: module.default.development,
            hasFetch: typeof module.default.fetch === 'function',
          });

          // Check if we have a Bun server with fetch method
          if (typeof module.default.fetch === 'function') {
            console.log('Starting Bun server on port', module.default.port);
            Bun.serve({
              port: module.default.port,
              fetch: module.default.fetch,
              development: module.default.development,
            });
            console.log('Server started successfully on port', module.default.port);
          } else {
            console.log("Server object does not have fetch method, assuming it's already running");
            console.log('Server started successfully on port', module.default.port);
          }
        })
        .catch((error) => {
          console.error('Error loading server:', error);
          process.exit(1);
        });
    });
} catch (error) {
  console.error('Error in startup script:', error);
  process.exit(1);
}

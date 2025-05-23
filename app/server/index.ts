async function initializeOtel() {
  if (process.env.NODE_ENV === 'production') {
    try {
      await import('./otel');
      console.log('OpenTelemetry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry:', error);
    }
  }
}

// Initialize OpenTelemetry before importing the main application
await initializeOtel();

// Import and export the main application
export { default } from './entry';

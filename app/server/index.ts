// import { env } from '@/utils/config/env.server';

// // Initialize OpenTelemetry before importing the main application
// if (env.isOtelEnabled) {
//   try {
//     await import('./otel');
//   } catch (error) {
//     console.error('Failed to initialize OpenTelemetry:', error);
//   }
// }

// Import and export the main application
export { default } from './entry';

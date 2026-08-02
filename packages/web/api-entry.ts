/**
 * Vercel Serverless Entry Point
 * 
 * This file serves as the bridge between Vercel's serverless infrastructure
 * and the existing Hono application. It simply re-exports the app instance
 * from the existing source code without modifying any business logic.
 * 
 * Vercel will automatically detect this file and create a serverless function
 * that handles all requests matching the configured patterns.
 */
import app from './src/api/index';

export default app;
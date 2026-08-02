/**
 * esbuild script to bundle the Vercel serverless function.
 *
 * Why: Vercel's Node.js ESM runtime cannot resolve extensionless TypeScript
 * imports (e.g. `../src/api/index` without `.ts`). By bundling with esbuild,
 * all local TypeScript source files are compiled and inlined into a single
 * ESM file at build time — no runtime path resolution needed.
 *
 * npm packages (hono, better-auth, drizzle-orm, etc.) are kept external
 * because Vercel installs them from package.json anyway.
 */
import { build } from "esbuild";

await build({
  entryPoints: ["./api-entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "./api/index.mjs",
  // Keep npm packages external — Vercel installs them via package.json.
  // Only bundle local source files (src/api/**).
  external: [
    "hono",
    "hono/*",
    "@orpc/*",
    "@libsql/client",
    "drizzle-orm",
    "drizzle-orm/*",
    "better-auth",
    "better-auth/*",
    "@better-auth/*",
    "zod",
  ],
  // Allow .ts extensions in imports (esbuild resolves them natively)
  conditions: ["import", "node", "default"],
  // Sourcemap for debugging (optional, not deployed to production)
  sourcemap: false,
  // Minify for smaller cold starts
  minify: true,
  // Log level
  logLevel: "info",
});

console.log("✅ API bundle built: api/index.mjs");

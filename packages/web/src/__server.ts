import { resolve } from "path";
import app from "./api";

const port = Number(process.env.PORT ?? 3000);
const distDir = resolve(import.meta.dir, "../dist");
const indexPath = resolve(distDir, "index.html");

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return app.fetch(request);
    }

    const filePath = getStaticFilePath(url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback: serve index.html for client-side routing
    const index = Bun.file(indexPath);
    if (await index.exists()) {
      return new Response(index, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Build output not found. Run `bun run build` first.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
});

console.log(`Web server listening on http://localhost:${server.port}`);

/**
 * Resolve a request pathname to a static file path.
 * Uses path.resolve + prefix check to prevent directory traversal attacks.
 */
function getStaticFilePath(pathname: string) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!decoded) return indexPath;

  const resolved = resolve(distDir, decoded);

  // Security: ensure resolved path stays inside distDir
  if (!resolved.startsWith(distDir)) {
    return indexPath; // 404 fallback to SPA
  }

  return resolved;
}

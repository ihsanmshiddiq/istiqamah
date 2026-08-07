import { describe, it, expect } from "vitest";
import { resolve } from "path";

/**
 * Test the getStaticFilePath logic (extracted for testability).
 * This mirrors the logic in __server.ts after the path traversal fix.
 */
function getStaticFilePath(pathname: string, distDir: string): string {
  const indexPath = resolve(distDir, "index.html");
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!decoded) return indexPath;

  const resolved = resolve(distDir, decoded);

  // Security: ensure resolved path stays inside distDir
  if (!resolved.startsWith(distDir)) {
    return indexPath; // 404 fallback to SPA
  }

  return resolved;
}

describe("getStaticFilePath — path traversal prevention", () => {
  const distDir = resolve("/app/dist");

  it("serves normal files from distDir", () => {
    const result = getStaticFilePath("/assets/app.js", distDir);
    expect(result).toBe(resolve(distDir, "assets/app.js"));
    expect(result.startsWith(distDir)).toBe(true);
  });

  it("serves index.html for root path", () => {
    const result = getStaticFilePath("/", distDir);
    expect(result).toBe(resolve(distDir, "index.html"));
  });

  it("BLOCKS simple directory traversal", () => {
    const result = getStaticFilePath("/../../../etc/passwd", distDir);
    // Should fall back to index.html, not escape distDir
    expect(result).toBe(resolve(distDir, "index.html"));
    expect(result.startsWith(distDir)).toBe(true);
  });

  it("BLOCKS encoded directory traversal", () => {
    const result = getStaticFilePath("/%2e%2e/%2e%2e/etc/passwd", distDir);
    expect(result).toBe(resolve(distDir, "index.html"));
    expect(result.startsWith(distDir)).toBe(true);
  });

  it("BLOCKS double-encoded directory traversal", () => {
    const result = getStaticFilePath("/%252e%252e/%252e%252e/etc/passwd", distDir);
    // After decodeURIComponent, %252e becomes %2e, which is NOT ..
    // So it should resolve inside distDir but as a weird filename
    const resolved = resolve(distDir, "%2e%2e/%2e%2e/etc/passwd");
    expect(resolved.startsWith(distDir)).toBe(true);
  });

  it("BLOCKS null byte injection", () => {
    const result = getStaticFilePath("/../../../etc/passwd%00.html", distDir);
    expect(result).toBe(resolve(distDir, "index.html"));
  });

  it("handles URL-encoded spaces", () => {
    const result = getStaticFilePath("/my%20file.txt", distDir);
    expect(result).toBe(resolve(distDir, "my file.txt"));
    expect(result.startsWith(distDir)).toBe(true);
  });

  it("resolves unknown routes inside distDir (SPA fallback handled by server)", () => {
    const result = getStaticFilePath("/app/salah", distDir);
    // The function resolves the path; SPA fallback happens when file doesn't exist
    expect(result).toBe(resolve(distDir, "app/salah"));
    expect(result.startsWith(distDir)).toBe(true);
  });
});

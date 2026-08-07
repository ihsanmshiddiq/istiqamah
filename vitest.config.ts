import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/web/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // Short timeout for CI
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "packages/web/src/web"),
    },
  },
});

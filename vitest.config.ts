import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Core is DOM-free; default to a Node environment so DOM-dependence is caught.
    // The React test opts into happy-dom via a `// @vitest-environment happy-dom` directive.
    environment: "node",
    passWithNoTests: true,
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/index.ts", "src/types.ts"],
    },
  },
});

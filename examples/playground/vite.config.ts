import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Resolve `sprung` and `sprung/react` to the library source so the demo runs
// against live code with no build step. (Exact-match regexes so `sprung/react`
// isn't swallowed by the `sprung` alias.)
export default defineConfig({
  plugins: [react()],
  resolve: {
    // The library source lives outside this app, so its `import "react"` would
    // otherwise resolve to a *second* React copy → "null dispatcher". Dedupe to one.
    dedupe: ["react", "react-dom"],
    alias: [
      {
        find: /^sprung\/react$/,
        replacement: fileURLToPath(new URL("../../src/react.ts", import.meta.url)),
      },
      {
        find: /^sprung$/,
        replacement: fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
      },
    ],
  },
});

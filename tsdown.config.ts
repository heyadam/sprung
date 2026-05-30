import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/react.ts"],
  format: ["esm", "cjs"],
  dts: true,
  platform: "neutral",
  treeshake: true,
  clean: true,
  sourcemap: true,
  // `react` is a peerDependency, so tsdown externalizes it automatically —
  // it is never bundled into the adapter entry.
});

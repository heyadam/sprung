# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`sprung` is a published-to-be npm library: a zero-dependency, framework-agnostic spring-animation engine (a closed-form damped harmonic oscillator) with a thin React adapter. Single package (published on npm as `sprungdesign`), two entry points: `sprungdesign` (core) and `sprungdesign/react`.

## Commands

```bash
npm run build          # tsdown → dist/ (ESM .js + CJS .cjs + .d.ts/.d.cts, code-split shared chunk)
npm run test           # vitest run (runtime tests; node env by default)
npm run test:watch     # vitest watch
npm run test:types     # vitest --typecheck.only — runs test/*.test-d.ts (type-level assertions)
npm run typecheck      # tsc --noEmit (also type-checks test/, including .test-d.ts)
npm run lint           # biome check .   (lint + format check)
npm run lint:fix       # biome check --write .   (run this to auto-fix before committing)
npm run check:package  # publint + attw --pack .  (exports-map / dual-format validation)
npm run size           # size-limit (brotli-min budgets in .size-limit.json)

# Run a single test file or by name:
npx vitest run test/solver.rk4.test.ts
npx vitest run -t "velocity"

# Demo (separate mini-app):
cd examples/playground && npm install && npm run dev   # http://localhost:5173
```

The full CI gate (`.github/workflows/ci.yml`) is: lint → typecheck → test → test:types → build → check:package → size. Run these locally before pushing.

## Architecture

Three layers, strictly separated:

1. **`src/solver.ts` — `createSpring()`**: the pure analytical solver. No side effects, no rAF, no DOM. `at(t)` is a pure function of elapsed seconds (frame-rate independent), split into under/critical/over-damped regimes. This + `src/feel.ts` (`fromFeel`) are **verbatim ports** of the math in `spring-tuner.jsx` (the validated reference at repo root) — **do not rewrite the math**; it's checked against an independent RK4 integration in `test/solver.rk4.test.ts`. `createSpring` validates inputs up front (throws `RangeError`) but the regime math below the guard is untouched.

2. **`src/controller.ts` — `spring()`**: the live, interruptible controller that drives `requestAnimationFrame`. The headline feature lives here: **velocity-continuous interruption** — `set(target)` reads the current value+velocity and builds a *fresh* solver anchored there, so continuity is structural, not approximated. `tick()` schedules the next frame *before* calling `onUpdate` (so a throwing callback can't strand the loop) and terminates on `done` or a non-finite sample.

3. **`src/react.ts` — `useSpring()`** → the `sprungdesign/react` entry. Wraps the controller; SSR-safe; reduced-motion snaps; velocity-continuous retarget on `target` change.

`src/index.ts` is the core barrel and **must never import `src/react.ts`** — that's what keeps the core React-free. The two are separate tsdown entries.

### Load-bearing invariants (verify before changing)

- **DOM-free / SSR-safe core.** Nothing in the `src/index.ts` import graph may touch `window`/`document`/`requestAnimationFrame` at module load. The controller resolves its clock (`now`) and scheduler (`raf`/`caf`) lazily inside function bodies, with `typeof` guards and a `setTimeout` fallback; all three are injectable (used for deterministic fake-clock tests). `test/ssr.test.ts` runs in a `node` env and asserts this.
- **Tiny public API by design.** `createSpring`, `spring`, `fromFeel`, `presets`, `useSpring` + types. Resist feature creep (no decay/keyframes/timeline). API stability matters — it's published.
- **`to` is omitted from the controller/hook config** (`SpringControllerConfig extends Omit<SpringConfig, "to">`): the controller starts at rest at `from` and animates only via `set()`. Don't re-add `to` there.

### Tests are the spec / quality gates

Per-file environment is set by a directive comment: default is `node`; `test/react.test.tsx` starts with `// @vitest-environment happy-dom`. Type-level tests live in `test/*.test-d.ts` (run via `test:types`, also caught by `typecheck`). The two headline gates are `solver.rk4.test.ts` (math correctness vs RK4) and `controller.interruption.test.ts` (value+velocity continuity across retargets, via an injected fake clock).

## Packaging & release

- tsdown emits dual ESM/CJS + declarations and **code-splits** the shared solver/controller into a hashed `dist/controller-*.{js,cjs}` chunk imported by both entries. `package.json` uses the nested exports form (`import`/`require` → `{ types, default }`) plus a `typesVersions` shim so `attw` passes clean for node10 subpaths too. Keep `publint` + `attw` green when touching exports.
- Release is Changesets + npm provenance (`.github/workflows/release.yml`). **Not published yet** — see `RELEASING.md` for the checklist (it documents the one-time "Allow GitHub Actions to create and approve pull requests" repo setting the release workflow needs; until then that workflow red-Xes benignly and never publishes).

## Gotchas

- **`npm ci` cross-platform lockfile**: incremental `npm install -D` can leave `package-lock.json` missing the wasm-fallback binding's optional deps (`@emnapi/*`), which `npm ci` rejects on Linux CI. If CI fails at install, regenerate with a clean `rm -rf node_modules package-lock.json && npm install` (a full re-resolution records the foreign-platform entries).
- **`examples/playground`** is a standalone Vite app that resolves `sprungdesign`/`sprungdesign/react` to `../../src` via aliases; its `vite.config.ts` must keep `resolve.dedupe: ["react", "react-dom"]` or you get a duplicate-React "null dispatcher" crash (the library source's own `react` devDep is a second copy).
- **`spring-tuner.jsx`** at the repo root is the reference artifact (excluded from Biome, tsconfig, and the published package); the live demo is `examples/playground`.

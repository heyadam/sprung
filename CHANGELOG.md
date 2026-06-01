# sprung

## 0.1.2

### Patch Changes

- 5bd7a5e: Performance: trim per-sample work in the solver and per-retarget work in the controller, with no change to public API or behavior.

  - **Solver** (`createSpring`): each damping regime now returns `SpringState` directly instead of allocating an intermediate `{ x, v }` object per sample, and the velocity coefficients (underdamped) / settle terms (critical) are hoisted out of the per-sample hot path. The regime math is unchanged — output is bit-for-bit identical for every finite `t` (verified across a wide config grid and the RK4 gate).
  - **Controller** (`spring`): `set()`/`stop()` update the live value/velocity in place via a `sync()` helper (no throwaway snapshot object), and repeated `set()` calls now reuse an already-pending animation frame instead of cancelling and rescheduling it. Velocity-continuous interruption is unchanged, including repeated and re-entrant `set()` calls; new regression tests cover both.

## 0.1.1

### Patch Changes

- 56962d3: Clamp the controller's elapsed time to ≥ 0 so a non-monotonic injected clock (e.g. a backward `now()` step under NTP skew or a custom clock) can't feed negative time into the solver and diverge.

## 0.1.0

### Minor Changes

- 6ffe23e: Initial public release: closed-form damped-harmonic-oscillator solver (`createSpring`), velocity-continuous interruptible controller (`spring`), the `fromFeel` designer mapping, named `presets`, and the `useSpring` React hook (`sprung/react`). Zero-dependency, SSR-safe, dual ESM+CJS.

---
"sprungdesign": patch
---

Performance: trim per-sample work in the solver and per-retarget work in the controller, with no change to public API or behavior.

- **Solver** (`createSpring`): each damping regime now returns `SpringState` directly instead of allocating an intermediate `{ x, v }` object per sample, and the velocity coefficients (underdamped) / settle terms (critical) are hoisted out of the per-sample hot path. The regime math is unchanged — output is bit-for-bit identical for every finite `t` (verified across a wide config grid and the RK4 gate).
- **Controller** (`spring`): `set()`/`stop()` update the live value/velocity in place via a `sync()` helper (no throwaway snapshot object), and repeated `set()` calls now reuse an already-pending animation frame instead of cancelling and rescheduling it. Velocity-continuous interruption is unchanged, including repeated and re-entrant `set()` calls; new regression tests cover both.

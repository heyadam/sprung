# sprung

## 0.1.1

### Patch Changes

- 56962d3: Clamp the controller's elapsed time to ≥ 0 so a non-monotonic injected clock (e.g. a backward `now()` step under NTP skew or a custom clock) can't feed negative time into the solver and diverge.

## 0.1.0

### Minor Changes

- 6ffe23e: Initial public release: closed-form damped-harmonic-oscillator solver (`createSpring`), velocity-continuous interruptible controller (`spring`), the `fromFeel` designer mapping, named `presets`, and the `useSpring` React hook (`sprung/react`). Zero-dependency, SSR-safe, dual ESM+CJS.

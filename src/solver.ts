import type { Spring, SpringConfig } from "./types";

/**
 * Closed-form damped harmonic oscillator solver.
 *
 * STUB — the verbatim port from `spring-tuner.jsx` lands in Phase 1, validated
 * against an RK4 numerical integration of the same ODE.
 */
export function createSpring(config: SpringConfig): Spring {
  const to = config.to ?? 0;
  return {
    zeta: 0,
    w0: 0,
    at: (_tSeconds: number) => ({ value: to, velocity: 0, done: true }),
  };
}

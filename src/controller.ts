import type { SpringControllerConfig, SpringHandle } from "./types";

/**
 * Live, interruptible spring controller that drives `requestAnimationFrame`.
 *
 * STUB — the rAF driver, injectable clock, and velocity-continuous `.set()`
 * land in Phase 2, validated by the interruption-continuity tests.
 */
export function spring(config: SpringControllerConfig): SpringHandle {
  const value = config.from ?? 0;
  const velocity = config.velocity ?? 0;
  return {
    set: (_target: number) => {
      /* implemented in Phase 2 */
    },
    stop: () => {
      /* implemented in Phase 2 */
    },
    get: () => ({ value, velocity }),
  };
}

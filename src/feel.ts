import type { FeelOptions, SpringParams } from "./types";

/**
 * Designer-facing mapping from `{ duration, bounce }` to physics constants.
 *
 * STUB — the verbatim port from `spring-tuner.jsx` lands in Phase 3.
 */
export function fromFeel(opts: FeelOptions = {}): SpringParams {
  return { stiffness: 180, damping: 12, mass: opts.mass ?? 1 };
}

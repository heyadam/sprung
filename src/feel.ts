import type { FeelOptions, SpringParams } from "./types";

/**
 * Designer-facing mapping: think in `duration` + `bounce`, not stiffness/damping.
 *
 * `bounce ∈ [-1, 1]`:  > 0 bouncy (underdamped), 0 critical, < 0 sluggish (overdamped).
 * Feeding the result into {@link createSpring} reproduces exactly the intended
 * damping ratio and natural frequency.
 *
 * Ported verbatim from the validated reference (`spring-tuner.jsx`).
 */
export function fromFeel({
  duration = 0.5,
  bounce = 0.2,
  mass = 1,
}: FeelOptions = {}): SpringParams {
  const zeta = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
  const w0 = (2 * Math.PI) / duration; // perceptual-ish mapping
  return {
    stiffness: w0 * w0 * mass,
    damping: 2 * zeta * w0 * mass,
    mass,
  };
}

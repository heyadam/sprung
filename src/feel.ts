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
  if (!(Number.isFinite(duration) && duration > 0)) {
    throw new RangeError(`fromFeel: duration must be > 0 (got ${duration})`);
  }
  if (!(Number.isFinite(mass) && mass > 0)) {
    throw new RangeError(`fromFeel: mass must be > 0 (got ${mass})`);
  }
  if (!Number.isFinite(bounce)) {
    throw new RangeError(`fromFeel: bounce must be a finite number (got ${bounce})`);
  }
  const raw = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
  // Clamp the damping ratio to a finite, strictly-positive range so every feel
  // settles in bounded time: bounce = 1 (undamped) and bounce ≤ -1 (infinite) are
  // degenerate. Only the extremes are affected; the usable range is untouched.
  const zeta = Math.min(Math.max(raw, 0.05), 10);
  const w0 = (2 * Math.PI) / duration; // perceptual-ish mapping
  return {
    stiffness: w0 * w0 * mass,
    damping: 2 * zeta * w0 * mass,
    mass,
  };
}

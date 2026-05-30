/**
 * Configuration for a spring. All fields are optional; physics defaults model
 * a moderately bouncy spring (stiffness 180, damping 12, mass 1).
 */
export interface SpringConfig {
  /** Spring constant `k`. Higher = snappier. Default 180. */
  stiffness?: number;
  /** Damping coefficient `c`. Higher = less oscillation. Default 12. */
  damping?: number;
  /** Mass `m`. Higher = more sluggish. Default 1. */
  mass?: number;
  /** Starting value. Default 0. */
  from?: number;
  /** Target value. Default 0. */
  to?: number;
  /** Initial velocity (units per second). Default 0. */
  velocity?: number;
  /** Settle threshold for `|value - target|`. Default 0.05. */
  restDistance?: number;
  /** Settle threshold for `|velocity|`. Default 0.05. */
  restVelocity?: number;
}

/** A sampled point on a spring's trajectory. */
export interface SpringState {
  value: number;
  velocity: number;
  done: boolean;
}

/** A pure, frame-rate-independent spring solver. */
export interface Spring {
  /** Sample the spring at time `tSeconds` after its start. */
  at(tSeconds: number): SpringState;
  /** Damping ratio ζ (<1 underdamped, =1 critical, >1 overdamped). */
  readonly zeta: number;
  /** Natural angular frequency ω₀ (rad/s). */
  readonly w0: number;
}

/** Configuration for the live `spring()` controller. */
// `to` is intentionally omitted: the controller starts at rest at `from` and
// animates only via `set(target)`, so accepting a `to` here would be a no-op.
export interface SpringControllerConfig extends Omit<SpringConfig, "to"> {
  /** Called every frame with the current value and velocity. */
  onUpdate: (value: number, velocity: number) => void;
  /** Called once when the spring settles. */
  onComplete?: () => void;
  /** Clock source in milliseconds. Defaults to `performance.now`. */
  now?: () => number;
  /** Frame scheduler. Defaults to `requestAnimationFrame`. */
  raf?: (callback: (time: number) => void) => number;
  /** Frame canceller. Defaults to `cancelAnimationFrame`. */
  caf?: (handle: number) => void;
}

/** Handle returned by `spring()` for driving and interrupting an animation. */
export interface SpringHandle {
  /** Retarget the spring, preserving current velocity (no jump). */
  set(target: number): void;
  /** Stop animating and freeze at the current value. */
  stop(): void;
  /** Read the current value and velocity. */
  get(): { value: number; velocity: number };
}

/** Designer-facing inputs for {@link fromFeel}. */
export interface FeelOptions {
  /** Perceptual duration in seconds. Default 0.5. */
  duration?: number;
  /**
   * Bounciness, nominally in [-1, 1]: >0 bouncy, 0 critical, <0 sluggish. Default 0.2.
   * The extremes are clamped to a settling range (the damping ratio is kept finite and
   * strictly positive), so values at/near ±1 stay usable rather than degenerate.
   */
  bounce?: number;
  /** Mass. Default 1. */
  mass?: number;
}

/** Physics constants produced by {@link fromFeel}. */
export interface SpringParams {
  stiffness: number;
  damping: number;
  mass: number;
}

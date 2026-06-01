import type { Spring, SpringConfig, SpringState } from "./types";

/**
 * Solve the damped harmonic oscillator in closed form.
 *
 * Models `m·x″ + c·x′ + k·x = 0` relative to the target, split into the three
 * damping regimes. The result is frame-rate independent and side-effect free:
 * `at(t)` is a pure function of elapsed seconds, so the same trajectory is
 * reproducible regardless of how often it is sampled.
 *
 * Ported verbatim from the validated reference (`spring-tuner.jsx`); the math is
 * checked against an independent RK4 integration in `test/solver.rk4.test.ts`.
 */
export function createSpring(config: SpringConfig = {}): Spring {
  const {
    stiffness = 180,
    damping = 12,
    mass = 1,
    from = 0,
    to = 0,
    velocity = 0,
    restDistance = 0.05,
    restVelocity = 0.05,
  } = config;

  // Validate once, off the per-sample hot path: degenerate physics would otherwise
  // silently yield a NaN or divergent trajectory.
  if (
    !(
      Number.isFinite(stiffness) &&
      Number.isFinite(damping) &&
      Number.isFinite(mass) &&
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      Number.isFinite(velocity) &&
      Number.isFinite(restDistance) &&
      Number.isFinite(restVelocity)
    )
  ) {
    throw new RangeError("createSpring: all numeric options must be finite numbers");
  }
  if (stiffness <= 0)
    throw new RangeError(`createSpring: stiffness must be > 0 (got ${stiffness})`);
  if (mass <= 0) throw new RangeError(`createSpring: mass must be > 0 (got ${mass})`);
  if (damping < 0) throw new RangeError(`createSpring: damping must be >= 0 (got ${damping})`);

  const w0 = Math.sqrt(stiffness / mass); // natural angular frequency
  const zeta = damping / (2 * Math.sqrt(stiffness * mass)); // damping ratio
  const d0 = from - to; // initial displacement from target
  const v0 = velocity;

  function state(x: number, v: number): SpringState {
    const done = Math.abs(x - to) < restDistance && Math.abs(v) < restVelocity;
    return { value: done ? to : x, velocity: done ? 0 : v, done };
  }

  let at: (t: number) => SpringState;

  if (zeta < 1) {
    // underdamped — the bouncy regime
    const wd = w0 * Math.sqrt(1 - zeta * zeta); // damped frequency
    const a = zeta * w0;
    const c2 = (v0 + a * d0) / wd;
    const vCos = -a * d0 + c2 * wd;
    const vSin = -a * c2 - d0 * wd;
    at = (t) => {
      const e = Math.exp(-a * t);
      const angle = wd * t;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = to + e * (d0 * cos + c2 * sin);
      const v = e * (vCos * cos + vSin * sin);
      return state(x, v);
    };
  } else if (zeta === 1) {
    // critically damped — fastest settle, no overshoot
    const k = v0 + w0 * d0;
    at = (t) => {
      const e = Math.exp(-w0 * t);
      const offset = d0 + k * t;
      const x = to + e * offset;
      const v = e * (k - w0 * offset);
      return state(x, v);
    };
  } else {
    // overdamped — slow, no overshoot
    const s = w0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * w0 + s;
    const r2 = -zeta * w0 - s;
    const c1 = (v0 - r2 * d0) / (r1 - r2);
    const cc2 = d0 - c1;
    at = (t) => {
      const e1 = Math.exp(r1 * t);
      const e2 = Math.exp(r2 * t);
      const x = to + c1 * e1 + cc2 * e2;
      const v = c1 * r1 * e1 + cc2 * r2 * e2;
      return state(x, v);
    };
  }

  return {
    zeta,
    w0,
    at,
  };
}

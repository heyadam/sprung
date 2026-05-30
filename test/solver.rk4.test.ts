import { describe, expect, it } from "vitest";
import { createSpring } from "../src/solver";

/**
 * GATE 1 — physics correctness.
 *
 * The analytical solver in `src/solver.ts` is the thing we ship. To prove its
 * closed-form math is right, we independently integrate the *same* ODE with a
 * classic 4th-order Runge–Kutta scheme and assert the two agree across a sweep
 * of stiffness × damping × mass × initial-conditions, covering all three
 * damping regimes.
 *
 * Displacement from the target is `y = value − to`, which obeys
 *   m·y″ + c·y′ + k·y = 0   ⇒   y″ = −(c/m)·y′ − (k/m)·y
 * as the first-order system  [y′, v′] = [v, −(c/m)·v − (k/m)·y].
 */
function rk4Samples(
  km: number,
  cm: number,
  d0: number,
  v0: number,
  h: number,
  steps: number,
  sampleEvery: number,
): { t: number; y: number; v: number }[] {
  const deriv = (y: number, v: number): readonly [number, number] => [v, -cm * v - km * y];

  let y = d0;
  let v = v0;
  let t = 0;
  const samples: { t: number; y: number; v: number }[] = [{ t, y, v }];

  for (let i = 1; i <= steps; i++) {
    const [k1y, k1v] = deriv(y, v);
    const [k2y, k2v] = deriv(y + (h / 2) * k1y, v + (h / 2) * k1v);
    const [k3y, k3v] = deriv(y + (h / 2) * k2y, v + (h / 2) * k2v);
    const [k4y, k4v] = deriv(y + h * k3y, v + h * k3v);
    y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    t += h;
    if (i % sampleEvery === 0) samples.push({ t, y, v });
  }
  return samples;
}

describe("createSpring — analytical solution vs RK4", () => {
  it("exposes the correct natural frequency and damping ratio", () => {
    const s = createSpring({ stiffness: 200, damping: 10, mass: 2 });
    expect(s.w0).toBeCloseTo(Math.sqrt(200 / 2), 12);
    expect(s.zeta).toBeCloseTo(10 / (2 * Math.sqrt(200 * 2)), 12);
  });

  it("reproduces the initial conditions exactly at t = 0", () => {
    const ics = [
      { from: 100, to: 0, velocity: 0 },
      { from: 0, to: 120, velocity: -50 },
      { from: 50, to: 200, velocity: 300 },
    ];
    for (const stiffness of [60, 500]) {
      for (const zeta of [0.3, 1, 2.5]) {
        const damping = zeta * 2 * Math.sqrt(stiffness);
        for (const ic of ics) {
          const s = createSpring({
            stiffness,
            damping,
            mass: 1,
            ...ic,
            restDistance: 0,
            restVelocity: 0,
          });
          const a = s.at(0);
          expect(a.value).toBeCloseTo(ic.from, 8);
          expect(a.velocity).toBeCloseTo(ic.velocity, 8);
        }
      }
    }
  });

  it("agrees with RK4 across the stiffness × damping × mass × IC sweep", () => {
    const stiffnesses = [60, 200, 500];
    const masses = [0.5, 1, 2];
    // Sweep by damping *ratio* so each regime is hit precisely.
    // 0 = undamped, <1 = underdamped, 1 = critical (exact), >1 = overdamped.
    const zetas = [0, 0.15, 0.5, 0.85, 1, 1.7, 4];
    const ics = [
      { from: 100, to: 0, velocity: 0 }, // released from displacement
      { from: 0, to: 120, velocity: 0 }, // driven toward a target
      { from: 0, to: 0, velocity: 400 }, // kicked from rest at target
      { from: 50, to: 200, velocity: -300 }, // displaced and moving away
    ];

    const H = 2e-4;
    const STEPS = 15_000; // integrate to t = 3.0 s
    const SAMPLE_EVERY = 150; // compare every 0.03 s

    let maxValErr = 0;
    let maxVelErr = 0;
    let comparisons = 0;
    const regimes = { under: 0, critical: 0, over: 0 };

    for (const stiffness of stiffnesses) {
      for (const mass of masses) {
        for (const zeta of zetas) {
          const damping = zeta * 2 * Math.sqrt(stiffness * mass);
          for (const ic of ics) {
            const spring = createSpring({
              stiffness,
              damping,
              mass,
              ...ic,
              // Disable rest-snapping so we compare the raw closed-form trajectory.
              restDistance: 0,
              restVelocity: 0,
            });

            if (spring.zeta < 1) regimes.under++;
            else if (spring.zeta === 1) regimes.critical++;
            else regimes.over++;

            const w0 = spring.w0;
            const d0 = ic.from - ic.to;
            const v0 = ic.velocity;
            const scale = Math.max(Math.abs(d0), Math.abs(v0) / w0, 1);

            const samples = rk4Samples(
              stiffness / mass,
              damping / mass,
              d0,
              v0,
              H,
              STEPS,
              SAMPLE_EVERY,
            );
            for (const sample of samples) {
              const a = spring.at(sample.t);
              const valErr = Math.abs(a.value - (sample.y + ic.to)) / scale;
              const velErr = Math.abs(a.velocity - sample.v) / (scale * w0);
              if (valErr > maxValErr) maxValErr = valErr;
              if (velErr > maxVelErr) maxVelErr = velErr;
              comparisons++;
            }
          }
        }
      }
    }

    console.log(
      `[RK4 sweep] ${stiffnesses.length}×${masses.length}×${zetas.length}×${ics.length} configs, ` +
        `${comparisons} sample comparisons | ` +
        `regimes under/critical/over = ${regimes.under}/${regimes.critical}/${regimes.over} | ` +
        `max normalized error: value=${maxValErr.toExponential(2)}, velocity=${maxVelErr.toExponential(2)}`,
    );

    // All three regimes must be exercised by the sweep.
    expect(regimes.under).toBeGreaterThan(0);
    expect(regimes.critical).toBeGreaterThan(0);
    expect(regimes.over).toBeGreaterThan(0);

    // Analytical and numerical solutions must agree to well within tolerance.
    expect(maxValErr).toBeLessThan(1e-3);
    expect(maxVelErr).toBeLessThan(1e-3);
  });

  it("settles to the target for every damped spring (ζ > 0)", () => {
    for (const stiffness of [60, 200, 500]) {
      for (const mass of [0.5, 1, 2]) {
        for (const zeta of [0.15, 0.5, 0.85, 1, 1.7, 4]) {
          const damping = zeta * 2 * Math.sqrt(stiffness * mass);
          const s = createSpring({
            stiffness,
            damping,
            mass,
            from: 200,
            to: 30,
            velocity: -120,
            restDistance: 0,
            restVelocity: 0,
          });
          expect(s.at(30).value).toBeCloseTo(30, 4);
          expect(s.at(30).velocity).toBeCloseTo(0, 4);
        }
      }
    }
  });

  it("overshoots when underdamped, but not when critically/over-damped (released from rest)", () => {
    const grid = Array.from({ length: 400 }, (_, i) => (i / 399) * 5);
    const base = { stiffness: 200, mass: 1, from: 100, to: 0, restDistance: 0, restVelocity: 0 };

    for (const zeta of [0.15, 0.5, 0.85]) {
      const damping = zeta * 2 * Math.sqrt(base.stiffness * base.mass);
      const s = createSpring({ ...base, damping });
      const min = Math.min(...grid.map((t) => s.at(t).value));
      expect(min).toBeLessThan(-0.001); // crosses below the target → overshoot
    }

    for (const zeta of [1, 1.7, 4]) {
      const damping = zeta * 2 * Math.sqrt(base.stiffness * base.mass);
      const s = createSpring({ ...base, damping });
      const min = Math.min(...grid.map((t) => s.at(t).value));
      expect(min).toBeGreaterThanOrEqual(-1e-9); // monotonic approach, never crosses
    }
  });
});

import { describe, expect, it } from "vitest";
import { fromFeel } from "../src/feel";
import { presets } from "../src/presets";
import { createSpring } from "../src/solver";

describe("fromFeel", () => {
  it("maps the sign of `bounce` to the damping regime", () => {
    // bounce > 0 → underdamped (ζ = 1 − bounce)
    for (const bounce of [0.1, 0.4, 0.9]) {
      const s = createSpring(fromFeel({ bounce }));
      expect(s.zeta).toBeLessThan(1);
      expect(s.zeta).toBeCloseTo(1 - bounce, 10);
    }
    // bounce = 0 → critically damped
    expect(createSpring(fromFeel({ bounce: 0 })).zeta).toBeCloseTo(1, 10);
    // bounce < 0 → overdamped (ζ = 1 / (1 + bounce))
    for (const bounce of [-0.2, -0.5, -0.8]) {
      const s = createSpring(fromFeel({ bounce }));
      expect(s.zeta).toBeGreaterThan(1);
      expect(s.zeta).toBeCloseTo(1 / (1 + bounce), 10);
    }
  });

  it("maps `duration` to natural frequency (w0 = 2π / duration)", () => {
    for (const duration of [0.2, 0.5, 1.0, 1.5]) {
      const s = createSpring(fromFeel({ duration, bounce: 0.3 }));
      expect(s.w0).toBeCloseTo((2 * Math.PI) / duration, 8);
    }
  });

  it("scales stiffness/damping with mass while preserving the feel (ζ and w0)", () => {
    const a = fromFeel({ duration: 0.6, bounce: 0.3, mass: 1 });
    const b = fromFeel({ duration: 0.6, bounce: 0.3, mass: 3 });
    expect(b.mass).toBe(3);
    expect(b.stiffness).toBeCloseTo(a.stiffness * 3, 8);
    expect(b.damping).toBeCloseTo(a.damping * 3, 8);
    expect(createSpring(a).zeta).toBeCloseTo(createSpring(b).zeta, 10);
    expect(createSpring(a).w0).toBeCloseTo(createSpring(b).w0, 10);
  });

  it("uses sensible defaults (duration 0.5, bounce 0.2, mass 1)", () => {
    const p = fromFeel();
    expect(p.mass).toBe(1);
    const s = createSpring(p);
    expect(s.zeta).toBeCloseTo(0.8, 10);
    expect(s.w0).toBeCloseTo((2 * Math.PI) / 0.5, 8);
  });
});

describe("presets", () => {
  it("exposes the four named presets with finite, positive physics", () => {
    expect(Object.keys(presets).sort()).toEqual(["bouncy", "gentle", "lazy", "stiff"]);
    for (const config of Object.values(presets)) {
      const s = createSpring(config);
      expect(Number.isFinite(s.w0) && s.w0 > 0).toBe(true);
      expect(Number.isFinite(s.zeta) && s.zeta > 0).toBe(true);
    }
  });

  it("has the expected character (bouncy/gentle overshoot, lazy is sluggish)", () => {
    expect(createSpring(presets.bouncy).zeta).toBeLessThan(1);
    expect(createSpring(presets.gentle).zeta).toBeLessThan(1);
    expect(createSpring(presets.lazy).zeta).toBeGreaterThan(1);
  });
});

import { describe, expect, it } from "vitest";
import { fromFeel } from "../src/feel";
import { createSpring } from "../src/solver";

describe("createSpring input validation", () => {
  it("throws on non-positive stiffness/mass and negative damping", () => {
    expect(() => createSpring({ stiffness: 0 })).toThrow(RangeError);
    expect(() => createSpring({ stiffness: -1 })).toThrow(RangeError);
    expect(() => createSpring({ mass: 0 })).toThrow(RangeError);
    expect(() => createSpring({ mass: -2 })).toThrow(RangeError);
    expect(() => createSpring({ damping: -1 })).toThrow(RangeError);
  });

  it("throws on non-finite numeric options", () => {
    expect(() => createSpring({ stiffness: Number.NaN })).toThrow(RangeError);
    expect(() => createSpring({ to: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    expect(() => createSpring({ velocity: Number.NaN })).toThrow(RangeError);
  });

  it("accepts valid physics, including the undamped boundary (damping 0)", () => {
    expect(() => createSpring({ stiffness: 100, damping: 0, mass: 1 })).not.toThrow();
  });
});

describe("undamped springs never report rest (documented regime)", () => {
  // damping 0 is valid math but oscillates forever — the live controller needs
  // damping > 0 to complete. Pin the regime so a future change is deliberate.
  it("createSpring({ damping: 0 }) is never done", () => {
    const s = createSpring({ stiffness: 100, damping: 0, mass: 1, from: 100, to: 0 });
    for (const t of [0, 0.5, 1, 5, 20, 100]) {
      expect(s.at(t).done).toBe(false);
    }
  });
});

describe("fromFeel guards degenerate inputs", () => {
  it("throws on non-positive duration/mass and non-finite bounce", () => {
    expect(() => fromFeel({ duration: 0 })).toThrow(RangeError);
    expect(() => fromFeel({ duration: -1 })).toThrow(RangeError);
    expect(() => fromFeel({ mass: 0 })).toThrow(RangeError);
    expect(() => fromFeel({ bounce: Number.NaN })).toThrow(RangeError);
  });

  it("clamps the documented bounce endpoints (-1, 1) to finite, settling springs", () => {
    for (const bounce of [-1, 1]) {
      const params = fromFeel({ bounce });
      expect(Number.isFinite(params.stiffness)).toBe(true);
      expect(Number.isFinite(params.damping)).toBe(true);
      expect(params.damping).toBeGreaterThan(0);

      const s = createSpring({ ...params, from: 100, to: 0 });
      expect(s.zeta).toBeGreaterThanOrEqual(0.05);
      expect(s.zeta).toBeLessThanOrEqual(10);
      expect(s.at(60).done).toBe(true); // settles in bounded time (no runaway)
    }
  });
});

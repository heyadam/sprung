import { describe, expect, it } from "vitest";
import { createSpring } from "../src/solver";

describe("rest detection", () => {
  it("is done immediately when already at rest at the target", () => {
    const a = createSpring({ from: 50, to: 50, velocity: 0 }).at(0);
    expect(a.done).toBe(true);
    expect(a.value).toBe(50);
    expect(a.velocity).toBe(0);
  });

  it("snaps to the target when within BOTH thresholds", () => {
    const a = createSpring({ from: 50.02, to: 50, velocity: 0.01 }).at(0);
    expect(a.done).toBe(true);
    expect(a.value).toBe(50); // snapped, not 50.02
    expect(a.velocity).toBe(0);
  });

  it("is not done when distance exceeds the threshold (even if slow)", () => {
    const a = createSpring({ from: 51, to: 50, velocity: 0 }).at(0);
    expect(a.done).toBe(false);
    expect(a.value).toBeCloseTo(51, 10);
  });

  it("is not done when velocity exceeds the threshold (even if close)", () => {
    const a = createSpring({ from: 50.01, to: 50, velocity: 10 }).at(0);
    expect(a.done).toBe(false);
    expect(a.velocity).toBeCloseTo(10, 8);
  });

  it("respects custom restDistance / restVelocity", () => {
    const tight = createSpring({
      from: 51,
      to: 50,
      velocity: 1,
      restDistance: 0.5,
      restVelocity: 0.5,
    }).at(0);
    expect(tight.done).toBe(false); // 1 > 0.5 on both counts

    const loose = createSpring({
      from: 51,
      to: 50,
      velocity: 1,
      restDistance: 2,
      restVelocity: 2,
    }).at(0);
    expect(loose.done).toBe(true);
    expect(loose.value).toBe(50);
    expect(loose.velocity).toBe(0);
  });

  it("eventually settles and snaps exactly to the target", () => {
    const s = createSpring({ from: 0, to: 100, stiffness: 200, damping: 20, mass: 1 });
    expect(s.at(0).done).toBe(false);
    const settled = s.at(10);
    expect(settled.done).toBe(true);
    expect(settled.value).toBe(100); // exact, snapped
    expect(settled.velocity).toBe(0);
  });
});

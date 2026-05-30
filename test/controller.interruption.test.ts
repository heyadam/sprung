import { describe, expect, it, vi } from "vitest";
import { spring } from "../src/controller";
import type { SpringControllerConfig } from "../src/types";

/**
 * GATE 2 — interruption continuity.
 *
 * The controller is driven by a deterministic fake clock + scheduler so frames
 * can be stepped one at a time. The headline property: retargeting mid-flight
 * carries the current value AND velocity into the new trajectory, with no jump.
 */
function harness(config: Omit<SpringControllerConfig, "now" | "raf" | "caf">) {
  let clock = 0;
  let pending: ((time: number) => void) | null = null;
  let id = 0;

  const handle = spring({
    ...config,
    now: () => clock,
    raf: (cb) => {
      pending = cb;
      return ++id;
    },
    caf: () => {
      pending = null;
    },
  });

  function frame(dtMs = 16): void {
    clock += dtMs;
    const cb = pending;
    pending = null;
    cb?.(clock);
  }
  function advance(ms: number, dt = 16): void {
    const n = Math.max(1, Math.round(ms / dt));
    for (let i = 0; i < n; i++) frame(dt);
  }
  function runToRest(maxFrames = 5000, dt = 16): number {
    let i = 0;
    while (pending && i < maxFrames) {
      frame(dt);
      i++;
    }
    return i;
  }
  return {
    handle,
    frame,
    advance,
    runToRest,
    isPending: () => pending !== null,
  };
}

describe("spring() controller", () => {
  it("starts at `from` and stays put until set() is called", () => {
    const onUpdate = vi.fn();
    const { handle, frame } = harness({ from: 7, onUpdate });
    expect(handle.get().value).toBe(7);
    frame();
    frame();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(handle.get().value).toBe(7);
  });

  it("animates to the target and fires onComplete exactly once", () => {
    const onComplete = vi.fn();
    const { handle, runToRest } = harness({
      from: 0,
      stiffness: 200,
      damping: 20,
      mass: 1,
      onUpdate: () => {},
      onComplete,
    });
    handle.set(100);
    const frames = runToRest();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(handle.get().value).toBeCloseTo(100, 5);
    expect(handle.get().velocity).toBe(0);
    expect(frames).toBeGreaterThan(1);
    expect(frames).toBeLessThan(5000);
  });

  it("preserves value AND velocity across a mid-flight retarget (no jump)", () => {
    const { handle, advance } = harness({
      from: 0,
      stiffness: 180,
      damping: 8,
      mass: 1,
      onUpdate: () => {},
    });
    handle.set(100);
    advance(180); // mid-flight, moving fast
    const before = handle.get();
    expect(Math.abs(before.velocity)).toBeGreaterThan(1); // genuinely in motion

    handle.set(300); // retarget at the same instant
    const after = handle.get();

    expect(after.value).toBeCloseTo(before.value, 9);
    expect(after.velocity).toBeCloseTo(before.velocity, 9);
  });

  it("stays continuous across repeated interruptions and settles to the final target", () => {
    const updates: { value: number; velocity: number }[] = [];
    const { handle, advance } = harness({
      from: 0,
      stiffness: 200,
      damping: 10,
      mass: 1,
      onUpdate: (value, velocity) => updates.push({ value, velocity }),
    });

    handle.set(100);
    advance(150);
    handle.set(-50);
    advance(150);
    handle.set(200);
    advance(4000);

    const peakSpeed = Math.max(...updates.map((u) => Math.abs(u.velocity)));
    const dt = 0.016;
    let maxJump = 0;
    for (let i = 1; i < updates.length; i++) {
      const cur = updates[i];
      const prev = updates[i - 1];
      if (!cur || !prev) continue;
      maxJump = Math.max(maxJump, Math.abs(cur.value - prev.value));
    }
    // No frame-to-frame jump exceeds what the velocity physically allows → continuous.
    expect(maxJump).toBeLessThanOrEqual(peakSpeed * dt * 2 + 1e-6);
    expect(handle.get().value).toBeCloseTo(200, 4);
    expect(handle.get().velocity).toBeCloseTo(0, 4);
  });

  it("stop() freezes value/velocity without completing, and resuming stays continuous", () => {
    const onComplete = vi.fn();
    const { handle, advance } = harness({
      from: 0,
      stiffness: 150,
      damping: 6,
      mass: 1,
      onUpdate: () => {},
      onComplete,
    });

    handle.set(100);
    advance(120);
    const frozen = handle.get();
    expect(Math.abs(frozen.velocity)).toBeGreaterThan(1);

    handle.stop();
    expect(handle.get().value).toBeCloseTo(frozen.value, 9);
    expect(handle.get().velocity).toBeCloseTo(frozen.velocity, 9);

    advance(400); // nothing scheduled → no change, no completion
    expect(handle.get().value).toBeCloseTo(frozen.value, 9);
    expect(onComplete).not.toHaveBeenCalled();

    handle.set(0); // resume from the frozen state
    const resumed = handle.get();
    expect(resumed.value).toBeCloseTo(frozen.value, 9);
    expect(resumed.velocity).toBeCloseTo(frozen.velocity, 9);
  });

  it("stops scheduling frames once at rest (no runaway loop)", () => {
    const { handle, runToRest, isPending } = harness({
      from: 0,
      stiffness: 300,
      damping: 30,
      mass: 1,
      onUpdate: () => {},
    });
    handle.set(50);
    runToRest();
    expect(isPending()).toBe(false);
  });

  it("drives to completion with the default scheduler in a non-DOM env (timer fallback)", () => {
    vi.useFakeTimers();
    try {
      let clock = 0;
      const onComplete = vi.fn();
      const handle = spring({
        from: 0,
        stiffness: 400,
        damping: 40,
        mass: 1,
        now: () => clock, // deterministic clock; raf/caf use the default fallback
        onUpdate: () => {},
        onComplete,
      });
      handle.set(20);
      for (let i = 0; i < 600 && onComplete.mock.calls.length === 0; i++) {
        clock += 16;
        vi.advanceTimersByTime(16);
      }
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(handle.get().value).toBeCloseTo(20, 3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("constructs with default clock/scheduler without throwing (SSR-safe)", () => {
    expect(() => {
      const handle = spring({ from: 5, onUpdate: () => {} });
      expect(handle.get().value).toBe(5);
    }).not.toThrow();
  });
});

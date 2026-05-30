import { createSpring } from "./solver";
import type { Spring, SpringControllerConfig, SpringHandle } from "./types";

// Defaults are resolved lazily, inside function bodies — never at module load —
// so importing or constructing a controller is SSR-safe (touches no DOM globals).

function defaultNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function defaultRaf(callback: (time: number) => void): number {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(callback);
  }
  // Non-DOM fallback (~60fps). Cast: Node's setTimeout returns a Timeout object.
  return setTimeout(() => callback(defaultNow()), 16) as unknown as number;
}

function defaultCaf(handle: number): void {
  if (typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle);
  }
}

/**
 * Create a live, interruptible spring controller driven by requestAnimationFrame.
 *
 * The clock (`now`) and scheduler (`raf`/`caf`) are injectable and resolved
 * lazily, so importing or constructing a controller never touches the DOM — it
 * is SSR-safe and unit-testable with a fake clock.
 *
 * The controller starts at rest at `from`; animation begins when you call
 * `set(target)`. Retargeting mid-flight is **velocity-continuous**: the current
 * value and velocity are carried into a fresh solver, so there is no jump.
 */
export function spring(config: SpringControllerConfig): SpringHandle {
  const { onUpdate, onComplete } = config;
  const now = config.now ?? defaultNow;
  const raf = config.raf ?? defaultRaf;
  const caf = config.caf ?? defaultCaf;

  const physics = {
    stiffness: config.stiffness,
    damping: config.damping,
    mass: config.mass,
    restDistance: config.restDistance,
    restVelocity: config.restVelocity,
  };

  let value = config.from ?? 0;
  let velocity = config.velocity ?? 0;
  let solver: Spring | null = null;
  let startTime = 0;
  let frame: number | null = null;
  let running = false;

  // Current value/velocity — sampled live from the solver while running so that
  // interruptions and reads are exact even between frames.
  function sample(): { value: number; velocity: number } {
    if (running && solver) {
      const s = solver.at((now() - startTime) / 1000);
      return { value: s.value, velocity: s.velocity };
    }
    return { value, velocity };
  }

  function cancelFrame(): void {
    if (frame !== null) {
      caf(frame);
      frame = null;
    }
  }

  function tick(): void {
    frame = null;
    if (!running || !solver) return;
    const active = solver;
    const s = active.at((now() - startTime) / 1000);
    value = s.value;
    velocity = s.velocity;
    onUpdate(value, velocity);
    // If onUpdate re-entered (called set/stop), don't clobber its scheduling.
    if (solver !== active || !running) return;
    if (s.done) {
      running = false;
      solver = null;
      onComplete?.();
      return;
    }
    frame = raf(tick);
  }

  function set(target: number): void {
    const current = sample();
    value = current.value;
    velocity = current.velocity;
    solver = createSpring({ ...physics, from: value, velocity, to: target });
    startTime = now();
    running = true;
    cancelFrame();
    frame = raf(tick);
  }

  function stop(): void {
    const current = sample();
    value = current.value;
    velocity = current.velocity;
    running = false;
    solver = null;
    cancelFrame();
  }

  function get(): { value: number; velocity: number } {
    return sample();
  }

  return { set, stop, get };
}

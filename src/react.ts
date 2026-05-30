import { useEffect, useRef, useState } from "react";
import { spring } from "./controller";
import type { SpringConfig, SpringHandle } from "./types";

/** SSR-safe read of the user's reduced-motion preference. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Animate a number toward `target` with spring physics.
 *
 * Re-renders with the live value each frame and **retargets velocity-continuously**
 * when `target` changes — no jump mid-flight. The value starts *at* `target` on
 * mount (no entrance animation); pass a distinct feel via `config`.
 *
 * SSR-safe (returns `target` on the server, touches no DOM at import) and honors
 * `prefers-reduced-motion` by snapping instead of animating. `config` is read
 * once, when the controller is created.
 */
export function useSpring(target: number, config?: SpringConfig): number {
  const [value, setValue] = useState(target);
  const handleRef = useRef<SpringHandle | null>(null);
  const prevTargetRef = useRef(target);
  const configRef = useRef(config);
  configRef.current = config;

  // Construction has no side effects (no DOM, no scheduling), so it is safe to
  // create lazily during render and on the server; a controller from a discarded
  // concurrent render simply gets garbage-collected.
  if (handleRef.current === null) {
    handleRef.current = spring({ ...configRef.current, from: target, onUpdate: setValue });
  }

  useEffect(() => {
    if (target === prevTargetRef.current) return;
    prevTargetRef.current = target;

    if (prefersReducedMotion()) {
      // Snap: re-anchor the controller at the target so a later (non-reduced)
      // retarget stays continuous.
      handleRef.current?.stop();
      handleRef.current = spring({ ...configRef.current, from: target, onUpdate: setValue });
      setValue(target);
    } else {
      handleRef.current?.set(target);
    }
  }, [target]);

  // Stop any in-flight animation on unmount.
  useEffect(() => () => handleRef.current?.stop(), []);

  return value;
}

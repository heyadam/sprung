import { useState } from "react";
import type { SpringConfig } from "./types";

/**
 * React hook: animate a number toward `target`, velocity-continuously.
 *
 * STUB — the controller-driven, SSR-safe, reduced-motion-aware implementation
 * lands in Phase 4.
 */
export function useSpring(target: number, _config?: SpringConfig): number {
  const [value] = useState(target);
  return value;
}

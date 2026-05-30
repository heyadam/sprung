import type { SpringConfig } from "./types";

/**
 * Named presets — physics constants lifted verbatim from the reference tuner.
 * Validated in Phase 3.
 */
export const presets = {
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  bouncy: { stiffness: 320, damping: 14, mass: 1 },
  stiff: { stiffness: 420, damping: 40, mass: 1 },
  lazy: { stiffness: 80, damping: 26, mass: 1.4 },
} satisfies Record<string, SpringConfig>;

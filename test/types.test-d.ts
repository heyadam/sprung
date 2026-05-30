import { assertType, expectTypeOf } from "vitest";
import type {
  FeelOptions,
  Spring,
  SpringConfig,
  SpringHandle,
  SpringParams,
  SpringState,
} from "../src/index";
import { createSpring, fromFeel, presets, spring } from "../src/index";
import { useSpring } from "../src/react";

/**
 * GATE 4 — type-level tests on the public API. Checked by `tsc --noEmit` (the
 * `typecheck` script, which includes `test/`) and by `vitest --typecheck`.
 */

// createSpring — optional config, returns a Spring.
expectTypeOf(createSpring()).toEqualTypeOf<Spring>();
expectTypeOf(createSpring({ stiffness: 100, to: 5, velocity: 2 })).toEqualTypeOf<Spring>();
expectTypeOf(createSpring().at(0)).toEqualTypeOf<SpringState>();
expectTypeOf(createSpring().zeta).toEqualTypeOf<number>();
expectTypeOf(createSpring().w0).toEqualTypeOf<number>();

// spring() controller — onUpdate is required; returns a handle.
expectTypeOf(spring({ onUpdate: () => {} })).toEqualTypeOf<SpringHandle>();
const handle = spring({
  stiffness: 120,
  onUpdate: (value, velocity) => {
    expectTypeOf(value).toBeNumber();
    expectTypeOf(velocity).toBeNumber();
  },
});
expectTypeOf(handle.get()).toEqualTypeOf<{ value: number; velocity: number }>();
assertType<void>(handle.set(1));
assertType<void>(handle.stop());
// @ts-expect-error — onUpdate is required
spring({ stiffness: 100 });

// fromFeel — optional opts, returns physics constants.
expectTypeOf(fromFeel()).toEqualTypeOf<SpringParams>();
expectTypeOf(fromFeel({ duration: 0.5, bounce: 0.2, mass: 1 })).toEqualTypeOf<SpringParams>();
expectTypeOf<FeelOptions>().toEqualTypeOf<{ duration?: number; bounce?: number; mass?: number }>();

// presets — a record of named SpringConfigs.
expectTypeOf(presets).toMatchTypeOf<Record<string, SpringConfig>>();

// useSpring — (target, config?) => number.
expectTypeOf(useSpring).toEqualTypeOf<(target: number, config?: SpringConfig) => number>();
expectTypeOf(useSpring).returns.toBeNumber();
expectTypeOf(useSpring).parameter(1).toEqualTypeOf<SpringConfig | undefined>();

// @vitest-environment node
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createSpring, fromFeel, presets, spring } from "../src/index";
import { useSpring } from "../src/react";

/**
 * GATE 3a — SSR / non-DOM safety.
 *
 * This suite runs in Vitest's `node` environment: there is no `window` or
 * `document`. Importing and exercising the package must not throw, and the React
 * hook must server-render to the target value.
 */
describe("SSR / non-DOM safety", () => {
  it("runs in an environment with no DOM globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("imports and exercises the core without touching the DOM", () => {
    expect(() => {
      const s = createSpring({ from: 0, to: 100 });
      s.at(0.1);
      fromFeel({ duration: 0.4, bounce: 0.3 });
      const handle = spring({ from: 0, onUpdate: () => {} });
      handle.get();
      handle.stop();
      // presets are usable too
      createSpring(presets.bouncy);
    }).not.toThrow();
  });

  it("server-renders useSpring to the target value", () => {
    const Probe = ({ target }: { target: number }) =>
      createElement("span", null, String(Math.round(useSpring(target, presets.gentle))));

    const html = renderToString(createElement(Probe, { target: 42 }));
    expect(html).toContain("42");
  });
});

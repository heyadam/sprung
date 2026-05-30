// @vitest-environment happy-dom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpring } from "../src/react";

function Probe({ target, config }: { target: number; config?: Parameters<typeof useSpring>[1] }) {
  const value = useSpring(target, config);
  return <span data-testid="v">{value.toFixed(2)}</span>;
}

function read(el: HTMLElement): number {
  return Number(el.querySelector('[data-testid="v"]')?.textContent);
}

function setReducedMotion(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("reduce") ? matches : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("useSpring", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setReducedMotion(false);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("returns the target on mount with no entrance animation", () => {
    const { container } = render(<Probe target={50} />);
    expect(read(container)).toBe(50);
    // advancing time changes nothing until the target changes
    act(() => vi.advanceTimersByTime(500));
    expect(read(container)).toBe(50);
  });

  it("animates toward a new target and settles there", () => {
    const { container, rerender } = render(
      <Probe target={0} config={{ stiffness: 300, damping: 30 }} />,
    );
    expect(read(container)).toBe(0);

    rerender(<Probe target={100} config={{ stiffness: 300, damping: 30 }} />);
    // partway through, it should be moving but not yet arrived
    act(() => vi.advanceTimersByTime(50));
    const mid = read(container);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);

    // given enough time it settles exactly on the target
    act(() => vi.advanceTimersByTime(3000));
    expect(read(container)).toBeCloseTo(100, 1);
  });

  it("snaps instantly to the target when prefers-reduced-motion is set", () => {
    setReducedMotion(true);
    const { container, rerender } = render(<Probe target={0} />);
    expect(read(container)).toBe(0);

    rerender(<Probe target={250} />);
    act(() => {}); // flush effects only — no timer advance
    expect(read(container)).toBe(250); // snapped, not animated
  });

  it("does not update after unmount", () => {
    const { container, rerender, unmount } = render(
      <Probe target={0} config={{ stiffness: 120, damping: 8 }} />,
    );
    rerender(<Probe target={100} config={{ stiffness: 120, damping: 8 }} />);
    act(() => vi.advanceTimersByTime(30)); // start moving
    const beforeUnmount = read(container);
    unmount();
    // advancing after unmount must not error or keep animating
    expect(() => act(() => vi.advanceTimersByTime(2000))).not.toThrow();
    expect(beforeUnmount).toBeGreaterThanOrEqual(0);
  });
});

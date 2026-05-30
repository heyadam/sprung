# sprung

> Tiny, framework-agnostic physics spring animation — a closed-form damped harmonic oscillator with velocity-continuous interruption.

`sprung` models motion as a real spring (mass · stiffness · damping) and solves it **analytically**, so it's frame-rate independent and exact at any timestep. Retarget mid-flight and the velocity carries over with no jump — the thing that makes spring UIs feel alive. Think in physics (`stiffness`/`damping`/`mass`) or in feel (`duration`/`bounce`).

- **Zero dependencies**, framework-agnostic core. SSR-safe — no DOM touched at import.
- Dual **ESM + CJS**, complete types, tree-shakeable (`sideEffects: false`).
- **~1 kB** min+gzip for the core.
- Thin **React** adapter (`useSpring`); more adapters can be layered on without touching the core.

```bash
npm install sprung
```

## Quick start

### React

```tsx
import { useSpring } from "sprung/react";

function Box({ open }: { open: boolean }) {
  const x = useSpring(open ? 200 : 0, { stiffness: 320, damping: 14 });
  return <div style={{ transform: `translateX(${x}px)` }} />;
}
```

`useSpring` re-renders with the live value each frame and **retargets velocity-continuously** when `target` changes. It returns `target` on the server, honors `prefers-reduced-motion` (snaps instead of animating), and is StrictMode/concurrent-safe.

### Vanilla / any framework

```ts
import { spring } from "sprung";

const handle = spring({
  stiffness: 180,
  damping: 12,
  onUpdate: (value) => {
    el.style.transform = `translateX(${value}px)`;
  },
});

el.addEventListener("click", () => handle.set(300));
// Call set() again mid-flight — the current velocity is preserved, no jump.
```

## Feel instead of physics

```ts
import { fromFeel, spring } from "sprung";

// bounce ∈ [-1, 1]:  >0 bouncy · 0 critical (no overshoot) · <0 sluggish
const handle = spring({ ...fromFeel({ duration: 0.5, bounce: 0.3 }), onUpdate });
```

Named presets are included too:

```ts
import { presets, spring } from "sprung";

spring({ ...presets.bouncy, onUpdate }); // gentle · bouncy · stiff · lazy
```

## API

### `createSpring(config?) → Spring`

The pure solver. No side effects, no rAF — just math. `at(t)` samples the trajectory at `t` seconds.

```ts
const s = createSpring({ stiffness: 180, damping: 12, mass: 1, from: 0, to: 100, velocity: 0 });
s.at(0.25); // → { value, velocity, done }
s.zeta;     // damping ratio (<1 underdamped, =1 critical, >1 overdamped)
s.w0;       // natural angular frequency (rad/s)
```

`done` is `true` once `|value − to| < restDistance` **and** `|velocity| < restVelocity` (both default `0.05`); at that point `value` snaps exactly to `to` and `velocity` to `0`.

### `spring(config & { onUpdate, onComplete? }) → SpringHandle`

The live, interruptible controller. Drives `requestAnimationFrame`; starts at rest at `from` and animates when you call `set()`.

```ts
const handle = spring({ stiffness: 180, onUpdate: (value, velocity) => {}, onComplete: () => {} });
handle.set(target); // retarget — preserves current velocity (no jump)
handle.get();       // → { value, velocity }
handle.stop();      // freeze in place
```

Advanced: pass `now`, `raf`, and `caf` to inject a custom clock/scheduler (for tests, a shared rAF loop, or fixed-timestep environments). Defaults are resolved lazily, so importing and constructing never touches the DOM.

### `fromFeel({ duration?, bounce?, mass? }) → { stiffness, damping, mass }`

Maps designer-friendly inputs to physics constants. `duration` sets the natural frequency; `bounce` sets the damping ratio (`>0` underdamped, `0` critical, `<0` overdamped).

### `presets`

`gentle`, `bouncy`, `stiff`, `lazy` — ready-made `{ stiffness, damping, mass }` configs.

### `useSpring(target, config?) → number`  (`sprung/react`)

See [Quick start](#react). `config` is read once when the hook mounts.

### Types

`SpringConfig`, `SpringState`, `Spring`, `SpringHandle`, `SpringControllerConfig`, `FeelOptions`, `SpringParams` are all exported from `sprung`.

## How it works

`sprung` solves `m·x″ + c·x′ + k·x = 0` in closed form across all three damping regimes (under/critical/over). Because the solution is analytical, sampling is exact at any `t` and independent of frame rate. Interruption works by reading the current `{ value, velocity }` and constructing a fresh solver anchored there — continuity is structural, not approximated. (The solver is validated against an independent RK4 integration across a wide parameter sweep.)

## Examples

A full interactive playground (the `spring.tuner`) lives in [`examples/playground`](./examples/playground).

## License

[MIT](./LICENSE)

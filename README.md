# sprung

> Tiny, framework-agnostic physics spring animation — a closed-form damped harmonic oscillator with velocity-continuous interruption.

**Status: in development.** Full documentation lands in Phase 5. See the [build plan](#) for the roadmap.

```bash
npm install sprung
```

```ts
import { createSpring, spring, fromFeel, presets } from "sprung";
import { useSpring } from "sprung/react";
```

- **Zero dependencies**, SSR-safe, tree-shakeable.
- Dual **ESM + CJS** with complete type declarations.
- Designer-friendly `fromFeel({ duration, bounce })` layer over raw physics.
- Velocity-continuous interruption: retarget mid-flight with no jump.

## License

MIT

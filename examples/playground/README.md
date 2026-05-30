# sprung · playground

The `spring.tuner` demo, rebuilt entirely on the published `sprung` API:

- the interactive **track** uses the `spring()` controller (click, then click again mid-flight to feel velocity carry over),
- the **response curve** is sampled from `createSpring().at(t)`,
- the controls use `fromFeel` and `presets`,
- the bottom strip uses the `useSpring` React hook.

It resolves `sprung` / `sprung/react` to the library source via a Vite alias, so no build or publish step is needed.

```bash
npm install
npm run dev      # http://localhost:5173
# or: npm run build && npm run preview
```

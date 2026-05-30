import React, { useCallback, useEffect, useRef, useState } from "react";

/* ────────────────────────────────────────────────────────────────────────
   CORE ENGINE — framework-agnostic, frame-rate independent (analytical)
   This is the part you'd actually ship. No React in here.
   ──────────────────────────────────────────────────────────────────────── */

// Solve the damped harmonic oscillator in closed form.
// Returns { at(t) -> {value, velocity, done}, zeta, w0 }
function createSpring({
  stiffness = 180,
  damping = 12,
  mass = 1,
  from = 0,
  to = 0,
  velocity = 0,
  restDistance = 0.05,
  restVelocity = 0.05,
} = {}) {
  const w0 = Math.sqrt(stiffness / mass); // natural angular frequency
  const zeta = damping / (2 * Math.sqrt(stiffness * mass)); // damping ratio
  const d0 = from - to; // initial displacement from target
  const v0 = velocity;

  let solve; // t (seconds) -> { x, v }

  if (zeta < 1) {
    // underdamped — the bouncy regime
    const wd = w0 * Math.sqrt(1 - zeta * zeta); // damped frequency
    const a = zeta * w0;
    const c2 = (v0 + a * d0) / wd;
    solve = (t) => {
      const e = Math.exp(-a * t);
      const cos = Math.cos(wd * t);
      const sin = Math.sin(wd * t);
      const x = to + e * (d0 * cos + c2 * sin);
      const v = e * ((-a * d0 + c2 * wd) * cos + (-a * c2 - d0 * wd) * sin);
      return { x, v };
    };
  } else if (zeta === 1) {
    // critically damped — fastest settle, no overshoot
    solve = (t) => {
      const e = Math.exp(-w0 * t);
      const k = v0 + w0 * d0;
      const x = to + e * (d0 + k * t);
      const v = e * (k - w0 * (d0 + k * t));
      return { x, v };
    };
  } else {
    // overdamped — slow, no overshoot
    const s = w0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * w0 + s;
    const r2 = -zeta * w0 - s;
    const c1 = (v0 - r2 * d0) / (r1 - r2);
    const cc2 = d0 - c1;
    solve = (t) => {
      const e1 = Math.exp(r1 * t);
      const e2 = Math.exp(r2 * t);
      const x = to + c1 * e1 + cc2 * e2;
      const v = c1 * r1 * e1 + cc2 * r2 * e2;
      return { x, v };
    };
  }

  return {
    zeta,
    w0,
    at(t) {
      const { x, v } = solve(t);
      const done = Math.abs(x - to) < restDistance && Math.abs(v) < restVelocity;
      return { value: done ? to : x, velocity: done ? 0 : v, done };
    },
  };
}

// Designer-facing layer: think in duration + bounce, not stiffness/damping.
// bounce ∈ [-1, 1]:  >0 bouncy, 0 critical, <0 sluggish.
function fromFeel({ duration = 0.5, bounce = 0.2, mass = 1 }) {
  const zeta = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
  const w0 = (2 * Math.PI) / duration; // perceptual-ish mapping
  return {
    stiffness: w0 * w0 * mass,
    damping: 2 * zeta * w0 * mass,
    mass,
  };
}

/* ────────────────────────────────────────────────────────────────────────
   PLAYGROUND UI
   ──────────────────────────────────────────────────────────────────────── */

const ACCENT = "#ff7a18";
const PRESETS = {
  Gentle: { stiffness: 120, damping: 14, mass: 1 },
  Bouncy: { stiffness: 320, damping: 14, mass: 1 },
  Stiff: { stiffness: 420, damping: 40, mass: 1 },
  Lazy: { stiffness: 80, damping: 26, mass: 1.4 },
};

function regimeOf(zeta) {
  if (zeta < 0.999) return ["underdamped", "overshoots & settles"];
  if (zeta > 1.001) return ["overdamped", "no overshoot, slow"];
  return ["critically damped", "fastest, no overshoot"];
}

export default function SpringTuner() {
  const [mode, setMode] = useState("physics"); // 'physics' | 'feel'
  const [stiffness, setStiffness] = useState(320);
  const [damping, setDamping] = useState(14);
  const [mass, setMass] = useState(1);
  const [duration, setDuration] = useState(0.5);
  const [bounce, setBounce] = useState(0.4);

  const params =
    mode === "physics" ? { stiffness, damping, mass } : fromFeel({ duration, bounce, mass: 1 });

  const w0 = Math.sqrt(params.stiffness / params.mass);
  const zeta = params.damping / (2 * Math.sqrt(params.stiffness * params.mass));
  const [regimeName, regimeDesc] = regimeOf(zeta);

  // animation state held in refs so the rAF loop never goes stale
  const trackRef = useRef(null);
  const springRef = useRef(null);
  const startRef = useRef(0);
  const valueRef = useRef(0); // current px position
  const velRef = useRef(0); // current px velocity
  const targetRef = useRef(0);
  const rafRef = useRef(0);
  const canvasRef = useRef(null);

  const [display, setDisplay] = useState({ value: 0, velocity: 0, done: true });

  // load distinctive fonts
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);

  const drawCurve = useCallback((spring, target, from) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width;
    const H = cv.height;
    ctx.clearRect(0, 0, W, H);

    const span = trackWidth();
    const lo = Math.min(from, target) - span * 0.15;
    const hi = Math.max(from, target) + span * 0.15;
    const range = Math.max(hi - lo, 1);
    const dur = 2.4;

    // target line
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.setLineDash([3, 4]);
    const ty = H - ((target - lo) / range) * H;
    ctx.beginPath();
    ctx.moveTo(0, ty);
    ctx.lineTo(W, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= W; i++) {
      const t = (i / W) * dur;
      const { value } = spring.at(t);
      const y = H - ((value - lo) / range) * H;
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
  }, []);

  const trackWidth = () => (trackRef.current ? trackRef.current.clientWidth - 56 : 320);

  const loop = useCallback((now) => {
    const t = (now - startRef.current) / 1000;
    const { value, velocity, done } = springRef.current.at(t);
    valueRef.current = value;
    velRef.current = velocity;
    setDisplay({ value, velocity, done });
    if (done) return;
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // retarget — THE interesting part: pick up current velocity, no jump
  const retarget = useCallback(
    (target) => {
      cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      springRef.current = createSpring({
        ...params,
        from: valueRef.current,
        velocity: velRef.current, // ← velocity continuity on interrupt
        to: target,
      });
      startRef.current = performance.now();
      drawCurve(springRef.current, target, valueRef.current);
      rafRef.current = requestAnimationFrame(loop);
    },
    [params, drawCurve, loop],
  );

  const onTrackClick = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - 28, trackWidth()));
    retarget(x);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };
  const serif = { fontFamily: "'Instrument Serif', serif" };

  const Slider = ({ label, value, set, min, max, step, fmt }) => (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs uppercase tracking-widest text-neutral-500" style={mono}>
          {label}
        </span>
        <span className="text-sm text-neutral-200" style={mono}>
          {fmt ? fmt(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(parseFloat(e.target.value))}
        className="w-full appearance-none h-[3px] rounded-full bg-neutral-700 cursor-pointer accent-orange-500"
      />
    </div>
  );

  return (
    <div
      className="min-h-screen w-full bg-neutral-950 text-neutral-100 px-6 py-10 flex justify-center"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 0%, rgba(255,122,24,0.07), transparent 55%)",
      }}
    >
      <div className="w-full max-w-3xl">
        <div className="flex items-end justify-between mb-1">
          <h1 className="text-5xl leading-none" style={serif}>
            spring<span style={{ color: ACCENT }}>.</span>tuner
          </h1>
          <span
            className="text-[10px] uppercase tracking-[0.25em] text-neutral-600 pb-2"
            style={mono}
          >
            damped harmonic oscillator
          </span>
        </div>
        <p className="text-neutral-500 text-sm mb-8" style={serif}>
          Click anywhere on the track — then click again mid-flight to feel the velocity carry over.
        </p>

        {/* TRACK */}
        <div
          ref={trackRef}
          onClick={onTrackClick}
          className="relative h-28 rounded-2xl bg-neutral-900 border border-neutral-800 cursor-pointer overflow-hidden mb-3"
        >
          <div
            className="absolute top-1/2 h-[2px] bg-neutral-800"
            style={{ left: 28, right: 28 }}
          />
          {/* target ghost */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-dashed transition-none"
            style={{
              left: targetRef.current + 8,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          />
          {/* the spring dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full grid place-items-center"
            style={{
              left: display.value + 4,
              background: `radial-gradient(circle at 35% 30%, ${ACCENT}, #c4490a)`,
              boxShadow: `0 0 28px ${ACCENT}66`,
            }}
          >
            <span className="text-[9px] text-black/70" style={mono}>
              {Math.round(display.value)}
            </span>
          </div>
        </div>

        {/* READOUT BAR */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            ["ζ damping ratio", zeta.toFixed(3)],
            ["regime", regimeName],
            ["", regimeDesc],
            ["velocity px/s", display.velocity.toFixed(1)],
          ].map(([k, v], i) => (
            <div key={i} className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-3">
              <div
                className="text-[9px] uppercase tracking-widest text-neutral-600 mb-1 h-3"
                style={mono}
              >
                {k}
              </div>
              <div
                className="text-sm"
                style={{
                  ...mono,
                  color: i === 1 ? ACCENT : "#e5e5e5",
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* CONTROLS */}
          <div>
            <div className="flex gap-1 mb-6 p-1 rounded-lg bg-neutral-900 border border-neutral-800 w-min">
              {["physics", "feel"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-4 py-1.5 rounded-md text-xs uppercase tracking-widest transition-colors"
                  style={{
                    ...mono,
                    background: mode === m ? ACCENT : "transparent",
                    color: mode === m ? "#0a0a0a" : "#737373",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {mode === "physics" ? (
              <>
                <Slider
                  label="stiffness (k)"
                  value={stiffness}
                  set={setStiffness}
                  min={20}
                  max={600}
                  step={1}
                />
                <Slider
                  label="damping (c)"
                  value={damping}
                  set={setDamping}
                  min={1}
                  max={60}
                  step={0.5}
                />
                <Slider
                  label="mass (m)"
                  value={mass}
                  set={setMass}
                  min={0.2}
                  max={3}
                  step={0.1}
                  fmt={(v) => v.toFixed(1)}
                />
              </>
            ) : (
              <>
                <Slider
                  label="duration (s)"
                  value={duration}
                  set={setDuration}
                  min={0.15}
                  max={1.5}
                  step={0.01}
                  fmt={(v) => v.toFixed(2)}
                />
                <Slider
                  label="bounce"
                  value={bounce}
                  set={setBounce}
                  min={-0.6}
                  max={0.9}
                  step={0.01}
                  fmt={(v) => v.toFixed(2)}
                />
              </>
            )}

            {mode === "physics" && (
              <div className="flex gap-2 mt-6 flex-wrap">
                {Object.entries(PRESETS).map(([name, p]) => (
                  <button
                    key={name}
                    onClick={() => {
                      setStiffness(p.stiffness);
                      setDamping(p.damping);
                      setMass(p.mass);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs border border-neutral-700 text-neutral-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
                    style={mono}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CURVE */}
          <div>
            <div
              className="text-[9px] uppercase tracking-widest text-neutral-600 mb-2"
              style={mono}
            >
              response curve (value vs time)
            </div>
            <canvas
              ref={canvasRef}
              width={360}
              height={200}
              className="w-full rounded-xl bg-neutral-900 border border-neutral-800"
            />
            <p className="text-neutral-600 text-xs mt-3" style={serif}>
              The dashed line is the target. With{" "}
              <span style={{ color: ACCENT }}>{regimeName}</span> settings, the value{" "}
              {zeta < 1 ? "overshoots and rings back" : "eases in without crossing"}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

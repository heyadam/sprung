import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSpring, fromFeel, presets, spring, type SpringHandle } from "sprung";
import { useSpring } from "sprung/react";

const ACCENT = "#ff7a18";
type Mode = "physics" | "feel";

function regimeOf(zeta: number): [string, string] {
  if (zeta < 0.999) return ["underdamped", "overshoots & settles"];
  if (zeta > 1.001) return ["overdamped", "no overshoot, slow"];
  return ["critically damped", "fastest, no overshoot"];
}

function Slider(props: {
  label: string;
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
  fmt?: (v: number) => string;
}) {
  const { label, value, set, min, max, step, fmt } = props;
  return (
    <div className="slider">
      <div className="slider-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{fmt ? fmt(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number.parseFloat(e.target.value))}
      />
    </div>
  );
}

/** A compact `useSpring` demo: tap to toggle the dot between two positions. */
function UseSpringStrip() {
  const [on, setOn] = useState(false);
  const x = useSpring(on ? 1 : 0, presets.bouncy);
  return (
    <button type="button" className="usespring" onClick={() => setOn((v) => !v)}>
      <span className="usespring-rail">
        <span className="usespring-dot" style={{ transform: `translateX(${x * 220}px)` }} />
      </span>
      <span className="hint">
        <code>useSpring</code> · tap to toggle (interrupt it mid-flight)
      </span>
    </button>
  );
}

export function SpringTuner() {
  const [mode, setMode] = useState<Mode>("physics");
  const [stiffness, setStiffness] = useState(320);
  const [damping, setDamping] = useState(14);
  const [mass, setMass] = useState(1);
  const [duration, setDuration] = useState(0.5);
  const [bounce, setBounce] = useState(0.4);

  const params = useMemo(
    () => (mode === "physics" ? { stiffness, damping, mass } : fromFeel({ duration, bounce })),
    [mode, stiffness, damping, mass, duration, bounce],
  );

  const w0 = Math.sqrt(params.stiffness / params.mass);
  const zeta = params.damping / (2 * Math.sqrt(params.stiffness * params.mass));
  const [regimeName, regimeDesc] = regimeOf(zeta);

  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<SpringHandle | null>(null);
  const valueRef = useRef(0);
  const velRef = useRef(0);
  const targetRef = useRef(0);
  const [display, setDisplay] = useState({ value: 0, velocity: 0 });

  const trackWidth = () => (trackRef.current ? trackRef.current.clientWidth - 56 : 320);

  const drawCurve = useCallback(
    (target: number, from: number) => {
      const cv = canvasRef.current;
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      const W = cv.width;
      const H = cv.height;
      ctx.clearRect(0, 0, W, H);

      const span = trackWidth();
      const lo = Math.min(from, target) - span * 0.15;
      const hi = Math.max(from, target) + span * 0.15;
      const range = Math.max(hi - lo, 1);
      const probe = createSpring({ ...params, from, to: target, restDistance: 0, restVelocity: 0 });

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
        const t = (i / W) * 2.4;
        const y = H - ((probe.at(t).value - lo) / range) * H;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();
    },
    [params],
  );

  // (Re)build the controller whenever physics change, preserving the current
  // value AND velocity, then resume toward the active target — so dragging a
  // slider mid-flight stays velocity-continuous.
  useEffect(() => {
    const prev = ctrlRef.current?.get() ?? { value: valueRef.current, velocity: velRef.current };
    ctrlRef.current?.stop();
    const ctrl = createController(prev.value, prev.velocity);
    ctrlRef.current = ctrl;
    ctrl.set(targetRef.current);
    return () => ctrl.stop();

    function createController(from: number, velocity: number): SpringHandle {
      return spring({
        ...params,
        from,
        velocity,
        onUpdate: (value, v) => {
          valueRef.current = value;
          velRef.current = v;
          setDisplay({ value, velocity: v });
        },
      });
    }
  }, [params]);

  // Redraw the response curve when the physics change.
  useEffect(() => {
    drawCurve(targetRef.current, valueRef.current);
  }, [drawCurve]);

  const retarget = (x: number) => {
    targetRef.current = x;
    ctrlRef.current?.set(x);
    drawCurve(x, valueRef.current);
  };

  const onTrackClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(e.clientX - rect.left - 28, trackWidth()));
    retarget(x);
  };

  return (
    <div className="page">
      <div className="shell">
        <header className="head">
          <h1>
            sprung<span style={{ color: ACCENT }}>.</span>tuner
          </h1>
          <span className="tag">damped harmonic oscillator</span>
        </header>
        <p className="lede">
          Click anywhere on the track — then click again mid-flight to feel the velocity carry over.
          Built entirely on the published <code>sprung</code> API.
        </p>

        {/* biome demo track */}
        <div ref={trackRef} className="track" onClick={onTrackClick}>
          <div className="track-line" />
          <div className="ghost" style={{ left: targetRef.current + 8 }} />
          <div
            className="dot"
            style={{ left: display.value + 4, background: `radial-gradient(circle at 35% 30%, ${ACCENT}, #c4490a)` }}
          >
            <span>{Math.round(display.value)}</span>
          </div>
        </div>

        <div className="readout">
          {[
            ["ζ damping ratio", zeta.toFixed(3)],
            ["regime", regimeName],
            ["", regimeDesc],
            ["velocity px/s", display.velocity.toFixed(1)],
          ].map(([k, v], i) => (
            <div key={k || i} className="cell">
              <div className="cell-k">{k}</div>
              <div className="cell-v" style={{ color: i === 1 ? ACCENT : undefined }}>
                {v}
              </div>
            </div>
          ))}
        </div>

        <div className="grid">
          <div>
            <div className="modes">
              {(["physics", "feel"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={mode === m ? "mode active" : "mode"}
                  onClick={() => setMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            {mode === "physics" ? (
              <>
                <Slider label="stiffness (k)" value={stiffness} set={setStiffness} min={20} max={600} step={1} />
                <Slider label="damping (c)" value={damping} set={setDamping} min={1} max={60} step={0.5} />
                <Slider
                  label="mass (m)"
                  value={mass}
                  set={setMass}
                  min={0.2}
                  max={3}
                  step={0.1}
                  fmt={(v) => v.toFixed(1)}
                />
                <div className="presets">
                  {Object.entries(presets).map(([name, p]) => (
                    <button
                      key={name}
                      type="button"
                      className="preset"
                      onClick={() => {
                        setStiffness(p.stiffness ?? 180);
                        setDamping(p.damping ?? 12);
                        setMass(p.mass ?? 1);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
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
          </div>

          <div>
            <div className="cell-k" style={{ marginBottom: 8 }}>
              response curve (value vs time)
            </div>
            <canvas ref={canvasRef} width={360} height={200} className="canvas" />
            <p className="hint" style={{ marginTop: 12 }}>
              w₀ = {w0.toFixed(1)} rad/s. With <span style={{ color: ACCENT }}>{regimeName}</span> settings, the value{" "}
              {zeta < 1 ? "overshoots and rings back" : "eases in without crossing"}.
            </p>
          </div>
        </div>

        <UseSpringStrip />
      </div>
    </div>
  );
}

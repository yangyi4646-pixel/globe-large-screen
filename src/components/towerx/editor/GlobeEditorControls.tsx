import type React from 'react';

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3
        className="text-[10px] uppercase text-white/45"
        style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.32em' }}
      >
        {label}
      </h3>
      {children}
    </section>
  );
}

export function Subsection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-l border-white/10 pl-3">
      <h4
        className="text-[9px] uppercase text-white/35"
        style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.24em' }}
      >
        {label}
      </h4>
      {children}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (next: number) => void;
}) {
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-[11px] text-white/70">
        <span>{label}</span>
        <span
          className="font-semibold tabular-nums text-white"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {value.toFixed(decimals)}
          {unit ? <span className="ml-0.5 text-white/40">{unit}</span> : null}
        </span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="globe-slider"
      />
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-[11px] text-white/70">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{
          background: value
            ? 'linear-gradient(135deg, #4d8bff, #8b5cf6)'
            : 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.16)'
        }}
      >
        <span
          className="absolute h-3.5 w-3.5 rounded-full bg-white transition-transform"
          style={{
            transform: value ? 'translateX(18px)' : 'translateX(3px)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
          }}
        />
      </button>
    </label>
  );
}

export function ColorInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-[11px] text-white/70">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-9 cursor-pointer rounded border border-white/20 bg-transparent"
        />
        <span
          className="text-[10px] tabular-nums text-white/80"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {value}
        </span>
      </span>
    </label>
  );
}

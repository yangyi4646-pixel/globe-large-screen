import { useSavedValue } from '../useTickingStats';
import { STATUS } from '../theme';
import { routes } from '../mock-data';

// Derived from the route table so FLOWS tracks the globe (was a
// hardcoded 19 / 19). Total = all lanes; active = lanes not in a
// `critical` (disrupted) state.
const ROUTE_TOTAL = routes.length;
const ROUTE_ACTIVE = routes.filter((r) => r.status !== 'critical').length;

/**
 * Telemetry — bottom-left mono telemetry strip. No glass backing —
 * floats directly on the globe canvas.
 *
 * Three columns × two rows of key/value pairs, all in JetBrains Mono.
 *
 * The strip overlaps the globe's day/night terminator, where the dot
 * field swings from near-black to bright blue across the width of the
 * text — so contrast against the backdrop alone is unreliable and the
 * readout smears into the planet. Rather than add a glass card (DESIGN
 * §9 keeps this card-less and atmospheric), every glyph carries its
 * own dark legibility halo via `textShadow`, so the readout stays
 * crisp over any part of the globe while still floating. Key/value
 * alpha is lifted a notch for the same reason.
 */
const TELEMETRY_SHADOW =
  '0 1px 10px rgba(8,4,26,0.85), 0 0 3px rgba(8,4,26,0.95)';

// Phase 2: 4 个静态值由 useTowerXConfig().telemetry 派生注入；
// FLOWS 仍派生自 routes 表，AI 规避损失仍由 useSavedValue 实时跳动
type TelemetryProps = {
  lat?: string;
  latency?: string;
  model?: string;
  confidence?: string;
  /** 客户给的初值，没传时 GoldRow 用 useSavedValue 实时数字 */
  savedAmount?: string;
  /** 行业术语本地化标签（默认 LAT / LATENCY / MODEL / CONFIDENCE）。 */
  latLabel?: string;
  latencyLabel?: string;
  modelLabel?: string;
  confidenceLabel?: string;
};

const DEFAULT_TELEMETRY_PROPS = {
  lat: '31.80°N',
  latency: '38 ms',
  model: 'TOWER-X · turbo',
  confidence: '99.2%',
  latLabel: 'LAT',
  latencyLabel: 'LATENCY',
  modelLabel: 'MODEL',
  confidenceLabel: 'CONFIDENCE'
} satisfies Required<Omit<TelemetryProps, 'savedAmount'>>;

function resolveTelemetryProps(props: TelemetryProps): Required<Omit<TelemetryProps, 'savedAmount'>> {
  return { ...DEFAULT_TELEMETRY_PROPS, ...props };
}

export function Telemetry(props: TelemetryProps = {}) {
  const { lat, latency, model, confidence, latLabel, latencyLabel, modelLabel, confidenceLabel } =
    resolveTelemetryProps(props);
  const tickingSaved = useSavedValue();
  const saved = props.savedAmount ?? tickingSaved;
  return (
    <div
      className="text-meta-ghost pointer-events-none flex gap-9"
      style={{
        fontSize: '10.5px',
        letterSpacing: '0.2em',
        textShadow: TELEMETRY_SHADOW
      }}
    >
      <Column>
        <Row k={latLabel} v={lat} />
        <Row k={latencyLabel} v={latency} />
      </Column>
      <Column>
        <Row k="FLOWS" v={`${ROUTE_ACTIVE} / ${ROUTE_TOTAL}`} gradient />
        <Row k={modelLabel} v={model} />
      </Column>
      <Column>
        <Row k={confidenceLabel} v={confidence} gradient />
        <GoldRow k="AI 规避损失" v={saved} />
      </Column>
    </div>
  );
}

function Column({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

function Row({ k, v, gradient }: { k: string; v: string; gradient?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 tabular-nums">
      <span className="text-white/55">{k}</span>
      <span className={gradient ? 'font-semibold text-white' : 'font-medium text-white'}>
        {v}
      </span>
    </div>
  );
}

/** 唯一暖色拍点:粗体金 ¥ 价值数字(DESIGN.md §2,预算 1)。 */
function GoldRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-3 tabular-nums">
      <span className="text-white/55">{k}</span>
      <span className="font-semibold" style={{ color: STATUS.warning }}>
        {v}
      </span>
    </div>
  );
}

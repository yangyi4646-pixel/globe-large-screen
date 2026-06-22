import { PALETTE, STATUS } from '../theme';
import { cities, alertPool, alerts, aiActions } from '../mock-data';

// Chrome counters are derived from the single data source so they can
// never drift from the globe again (they used to be hardcoded 16/04).
const NODE_COUNT = cities.length;
const ANOMALY_COUNT =
  alerts.length + alertPool.filter((a) => a.level === 'responding').length;
const AI_SUGGESTION_COUNT = aiActions.length;
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Header — top-left content block. No glass backing — floats directly on
 * the globe canvas, matching the user's reference (Control Tower.html).
 *
 * Now ships ONLY metadata bits + pill row. The main h1 ("Steering
 * /East Asia/ in real time") moved into the 3D scene as
 * `<SceneTitle>` so the globe sphere depth-occludes part of it (R3 B
 * depth illusion). Reserve title-sized vertical space here so the
 * pill row sits at the same y it did before the title moved — purely
 * a layout placeholder, no rendered glyphs.
 */
/**
 * Header renders TWICE at the same `top-10 left-12` anchor to fake
 * 3D depth without any WebGL/shader work:
 *
 *   layer="behind" → placed BEHIND the transparent GL canvas. Only
 *     the title h1 is visible; everything else is visibility:hidden
 *     but still occupies space so the flow (and thus the title's
 *     screen position) is identical to the front copy. Where the
 *     opaque globe is drawn it naturally covers this title = the
 *     "title behind the globe" illusion.
 *
 *   layer="front" (default) → the z-10 HUD layer. Everything visible
 *     and interactive EXCEPT the title h1, which is opacity:0 — it
 *     stays in flow as a spacer so the pills land exactly where they
 *     always did, while the real visible title comes from the behind
 *     copy.
 *
 * Net: pixel-identical title position between the two copies (layout
 * is the single source of truth, no fragile offset math), title gets
 * globe-occluded, pills stay crisp in front with working backdrop
 * blur. Both copies share one DOM subtree via this prop.
 */
type HeaderProps = {
  titleFontPx?: number;
  titleLineGap?: number;
  layer?: 'front' | 'behind';
  /** 危机聚焦(详情打开)时隐藏胶囊行,让放大后的左侧干净
   *  (R4-2)。只影响 front 层的 pill row。 */
  chromeHidden?: boolean;
  // Phase 2: 6 处 brand 文本由 useTowerXConfig().brand 派生注入
  metadataLine?: string;
  tagline?: string;
  heroTitleLine1?: string;
  heroFocalPhrase?: string;
  heroTitleLine2?: string;
  /** Week 2 Day 1: pill 行末位地理 / 节点数标签。
   *  形如 'EAST ASIA · 30 节点' —— 客户填业务地理范围 + 节点数（节点数
   *  通常派生自 cities.length，但因为本字段也接受静态文案，节点数也允许写死）。 */
  regionLabel?: string;
};

const DEFAULT_HEADER_PROPS = {
  titleFontPx: 84,
  titleLineGap: 0,
  layer: 'front',
  chromeHidden: false,
  metadataLine: '[01] · GLOBAL CONTROL TOWER · v 2.5',
  tagline: 'SUPPLY CHAIN · AUTONOMOUS RESPONSE',
  heroTitleLine1: 'Steering',
  heroFocalPhrase: 'East Asia',
  heroTitleLine2: 'in Real Time'
} satisfies Required<Omit<HeaderProps, 'regionLabel'>>;

type ResolvedHeaderProps = Required<Omit<HeaderProps, 'regionLabel'>> &
  Pick<HeaderProps, 'regionLabel'>;

function resolveHeaderProps(props: HeaderProps): ResolvedHeaderProps {
  return { ...DEFAULT_HEADER_PROPS, ...props };
}

function chromeStyle(behind: boolean): React.CSSProperties {
  return behind ? { visibility: 'hidden' } : {};
}

export function Header(props: HeaderProps) {
  const {
    titleFontPx,
    titleLineGap,
    layer,
    chromeHidden,
    metadataLine,
    tagline,
    heroTitleLine1,
    heroFocalPhrase,
    heroTitleLine2,
    regionLabel
  } = resolveHeaderProps(props);
  const behind = layer === 'behind';
  // Non-title chrome: visible+interactive on front, invisible spacer
  // on behind.
  const chrome = chromeStyle(behind);
  return (
    <header className="pointer-events-none max-w-[880px]">
      <p
        className="text-meta-secondary"
        style={{ letterSpacing: '0.28em', ...chrome }}
      >
        <span
          className="mr-3 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full align-middle"
          style={{
            background: `linear-gradient(135deg, var(--brand-primary, ${PALETTE.blue}), ${PALETTE.violet})`,
            boxShadow: '0 0 8px rgba(77, 139, 255, 0.7)'
          }}
        />
        {metadataLine}
      </p>

      <p
        className="text-meta-ghost mt-3"
        style={{ fontSize: '11px', letterSpacing: '0.32em', ...chrome }}
      >
        {tagline}
      </p>

      {/* Title — original DOM h1 (exact typography, zero Bloom glow,
          original top-left alignment). The "behind the globe" depth
          illusion is intentionally dropped: a 3D-occluded title cost
          ~12 failed iterations, and a CSS bottom-mask approximation
          didn't read as depth either. */}
      {/* Title weight stays bold (font-medium) for presence — the
          earlier light/dimmed framing read as timid. Hierarchy comes
          from the focal phrase "East Asia": italic Source Serif 4 cut +
          the one user-confirmed sanctioned gradient (Design.md §2) — a
          visible near-white → soft-blue sheen, blue-only (NOT the
          retired fg→violet) and NOT a reusable utility. This is the
          ONLY gradient-clipped text allowed; all small chrome stays
          solid. */}
      <HeaderTitle
        titleFontPx={titleFontPx}
        titleLineGap={titleLineGap}
        behind={behind}
        heroTitleLine1={heroTitleLine1}
        heroFocalPhrase={heroFocalPhrase}
        heroTitleLine2={heroTitleLine2}
      />

      {/* Bright lit hairline. §2: brand primary color (default blue-only, violet is AI-exclusive).
          Uses --brand-primary CSS var so settings.brand.primaryColor is reflected here. */}
      <div
        className="hairline-in mt-7 h-px w-16"
        style={{
          background:
            'linear-gradient(90deg, color-mix(in srgb, var(--brand-primary, #4d8bff) 60%, white) 0%, var(--brand-primary, #4d8bff) 38%, color-mix(in srgb, var(--brand-primary, #4d8bff) 50%, transparent) 70%, transparent)',
          ...chrome
        }}
      />

      <PillRow
        behind={behind}
        chromeHidden={chromeHidden}
        chrome={chrome}
        regionLabel={regionLabel}
      />
    </header>
  );
}

function HeaderTitle({
  titleFontPx,
  titleLineGap,
  behind,
  heroTitleLine1,
  heroFocalPhrase,
  heroTitleLine2
}: {
  titleFontPx: number;
  titleLineGap: number;
  behind: boolean;
  heroTitleLine1: string;
  heroFocalPhrase: string;
  heroTitleLine2: string;
}) {
  return (
    <h1
      className="mt-6 font-medium leading-[0.98] tracking-[-0.02em] text-white"
      style={{
        fontSize: `${titleFontPx}px`,
        opacity: behind ? 1 : 0,
        textShadow:
          '0 2px 34px rgba(8,4,26,0.65), 0 1px 6px rgba(8,4,26,0.55)'
      }}
    >
      <span className="block whitespace-nowrap">
        {heroTitleLine1} <HeroFocalPhrase>{heroFocalPhrase}</HeroFocalPhrase>
      </span>
      <span className="block whitespace-nowrap" style={{ marginTop: `${titleLineGap}px` }}>
        {heroTitleLine2}
      </span>
    </h1>
  );
}

function HeroFocalPhrase({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'Source Serif 4, serif',
        fontStyle: 'italic',
        fontWeight: 500,
        display: 'inline-block',
        paddingRight: '0.14em',
        backgroundImage:
          'linear-gradient(178deg, #fbfdff 0%, color-mix(in srgb, var(--brand-primary, #4d8bff) 25%, white) 55%, color-mix(in srgb, var(--brand-primary, #4d8bff) 50%, white) 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        textShadow: 'none'
      }}
    >
      {children}
    </span>
  );
}

function pillRowClass(behind: boolean, chromeHidden: boolean): string {
  const base = 'mt-6 flex flex-wrap items-center gap-3';
  return behind || chromeHidden ? base : `${base} pointer-events-auto`;
}

function pillRowOpacity(behind: boolean, chromeHidden: boolean): number | undefined {
  return !behind && chromeHidden ? 0 : undefined;
}

function PillRow({
  behind,
  chromeHidden,
  chrome,
  regionLabel
}: {
  behind: boolean;
  chromeHidden: boolean;
  chrome: React.CSSProperties;
  regionLabel?: string;
}) {
  return (
    <div
      className={pillRowClass(behind, chromeHidden)}
      style={{
        ...chrome,
        opacity: pillRowOpacity(behind, chromeHidden),
        transition: 'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)'
      }}
    >
      <Pill live delayMs={3450}>LIVE</Pill>
      <Pill delayMs={3560}>
        <span className="font-semibold text-white">{pad2(ANOMALY_COUNT)}</span> 异常事件
      </Pill>
      <Pill delayMs={3670}>
        <span className="font-semibold text-white">{pad2(AI_SUGGESTION_COUNT)}</span> AI 建议
      </Pill>
      <Pill delayMs={3780}>{regionLabel ?? `EAST ASIA · ${NODE_COUNT} 节点`}</Pill>
    </div>
  );
}

function Pill({
  children,
  live,
  delayMs
}: {
  children: React.ReactNode;
  live?: boolean;
  /** Phase-D intro stagger. Applied to THIS .liquid-glass leaf (never
   *  an ancestor) so the backdrop-filter is not trapped — a leaf's own
   *  opacity is sampled from the parent direction, see index.css. */
  delayMs?: number;
}) {
  return (
    /* Design.md §5/§9 pill exception. Pills keep the `.liquid-glass`
       wet-edge ::before + inset highlight, but the generic light-tier
       body (rgba(255,255,255,0.04) + blur 8px) is calibrated for the
       big right-column panels that sit over the globe's wide ambient
       BLOOM. These chips sit over the dark top-left globe (no bloom
       energy behind them), where 4% white + 8px blur is invisible —
       the first fix only swapped the opaque dark fill for something
       that read as nothing. So override the body to a present-but-
       translucent frost + stronger blur/saturate: it reads as a glass
       chip over the dark backdrop yet the globe still bleeds through.
       Ancestors must never add transform/filter/will-change/contain/
       opacity<1 or the backdrop-filter gets trapped (see index.css
       entry-stage). */
    <span
      className={`liquid-glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] text-white/85${
        delayMs != null ? ' pill-in' : ''
      }`}
      style={{
        animationDelay: delayMs != null ? `${delayMs}ms` : undefined,
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        // Body kept near the strong-tier value (0.045) now that the
        // backdrop-filter actually resolves (the entry-stage ancestor
        // that trapped it was removed in App.tsx) — a higher alpha
        // here just milks out the real blur. Internal sheen via inset
        // shadow (NOT a gradient background — §5 forbids background-
        // image on glass, Safari paints it over the blur): a bright
        // top inset + faint bottom inner glow give the iOS-glass-pill
        // luminosity (§1) so the chip still reads as lit glass over
        // the dark top-left globe.
        boxShadow:
          'inset 0 2px 1px rgba(255,255,255,0.38), inset 0 -10px 14px -10px rgba(255,255,255,0.14)',
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.18em'
      }}
    >
      {live ? (
        <span
          className="anim-pulse h-1.5 w-1.5 rounded-full"
          style={{
            background: STATUS.success,
            boxShadow: '0 0 10px rgba(95, 255, 184, 0.9)'
          }}
        />
      ) : null}
      {children}
    </span>
  );
}

import { Sparkles } from 'lucide-react';
import { relativeTime, alerts, type Alert } from '../mock-data';
import { ALERT } from '../theme';

// Phase 2: 默认走模板自带的 hongkong-shanghai；调用方传入 crisisRouteId
// prop 可切换到客户自己的危机航线
const DEFAULT_CRISIS_ROUTE_ID = 'hongkong-shanghai';

function findCrisisAlert(routeId: string): Alert {
  return alerts.find((a) => a.routeId === routeId) ?? alerts[0];
}

/**
 * AlertFeed — right-panel live event card. Renders a pinned crisis card
 * at the top plus `surfacedEvents` rows synced from the ambient engine.
 * Row state:
 *
 *   responding  — magenta contained chip (rounded-xl), pulse dot prefix
 *   closed       — plain row, no chrome
 *   ai-insight   — violet contained chip + Sparkles icon prefix, reads
 *                  as "AI just noticed something" (the beam-shimmer
 *                  effect lands in batch 3)
 *
 * The most recent insertion plays a slide-in animation via `data-fresh`.
 */
type AlertFeedProps = {
  /** Click handler — when provided, rows become buttons that emit the
   *  alert object (App.tsx uses it to swap the column to AlertDetail). */
  onAlertClick?: (alert: Alert) => void;
  /** Optional className passthrough so App.tsx can attach `entry-stage-2`
   *  for the first-paint fade-in directly on the glass card (see App.tsx
   *  for why the fade can't live on a wrapping container). */
  className?: string;
  /** 环境引擎同步浮现的事件行(危机卡之外)。 */
  surfacedEvents?: Alert[];
  // Phase 2: 由 useTowerXConfig() 注入
  crisisRouteId?: string;
  feedSubhead?: string;
};

export function AlertFeed({
  onAlertClick,
  className = '',
  surfacedEvents = [],
  crisisRouteId = DEFAULT_CRISIS_ROUTE_ID,
  feedSubhead = 'EAST ASIA · AUTO-TRIAGED'
}: AlertFeedProps = {}) {
  const CRISIS_ALERT = findCrisisAlert(crisisRouteId);

  // 毛玻璃：勿在祖先加 transform/filter/will-change/contain/opacity<1；
  // 勿把 .liquid-glass-strong 的 background 换成渐变（详见 src/index.css）。
  return (
    <section
      className={`liquid-glass-strong relative flex min-h-0 w-full flex-1 flex-col gap-4 rounded-[1.75rem] px-3 py-6 ${className}`}
      aria-label="实时事件流"
    >
      <header className="flex items-center justify-between px-3">
        <span
          className="text-meta-secondary"
          style={{ fontSize: '10.5px', letterSpacing: '0.28em' }}
        >
          ALERT FEED
        </span>
        <span
          className="flex items-center gap-2 text-[10px] uppercase text-emerald-300/90"
          style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.24em' }}
        >
          <span
            className="anim-pulse h-1.5 w-1.5 rounded-full bg-emerald-300"
            style={{ boxShadow: '0 0 8px rgba(95, 255, 184, 0.85)' }}
          />
          LIVE
        </span>
      </header>

      <div className="px-3">
        <h2 className="text-lg font-medium tracking-tight text-white">
          实时事件流
        </h2>
        <p
          className="text-meta-ghost mt-1"
          style={{ letterSpacing: '0.28em' }}
        >
          {feedSubhead}
        </p>
      </div>

      <Divider />

      <PinnedCrisis
        alert={CRISIS_ALERT}
        onClick={onAlertClick ? () => onAlertClick(CRISIS_ALERT) : undefined}
      />

      <div
        className="text-meta-ghost flex items-center gap-3 px-3 pt-1"
        style={{ fontSize: '10px', letterSpacing: '0.26em' }}
      >
        <span>其余 · AI 自主闭环</span>
        <span
          className="h-px flex-1"
          style={{
            background:
              'linear-gradient(90deg, rgba(180,170,255,0.20), transparent)'
          }}
        />
      </div>

      <ul
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
        style={{
          scrollbarWidth: 'none',
          maskImage:
            'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)'
        }}
      >
        {/* R12 剧本:置顶告警(上方 PinnedCrisis)→ 中段「进行中」
            (responding)→ 末段「已闭环/即将」(closed)。组内按时间
            倒序(最新在上),杜绝忽前忽后随机出现。 */}
        {[...surfacedEvents]
          .sort((a, b) => {
            const rank = (l: Alert['level']) =>
              l === 'responding' ? 0 : l === 'ai-insight' ? 1 : 2;
            const dr = rank(a.level) - rank(b.level);
            return dr !== 0 ? dr : b.timestamp - a.timestamp;
          })
          .map((alert, idx) => (
            <AlertRow
              alert={alert}
              key={alert.id}
              isFresh={idx === 0}
              onClick={onAlertClick ? () => onAlertClick(alert) : undefined}
            />
          ))}
      </ul>

      <Divider />

      <footer
        className="text-meta-secondary flex items-center justify-between px-3"
        style={{ fontSize: '10.5px', letterSpacing: '0.18em' }}
      >
        <span>持续监测中</span>
        <span className="font-semibold text-white">VIEW ALL ›</span>
      </footer>
    </section>
  );
}

/**
 * 置顶危机卡 — 常驻、比同步行更亮的品红卡。香港危机是全屏唯一品红
 * (DESIGN.md §2),它一直在最上面,不随环境列表滚走。
 */
function PinnedCrisis({
  alert,
  onClick
}: {
  alert: Alert;
  onClick?: () => void;
}) {
  return (
    <div
      className="alert-row flex cursor-pointer items-start gap-3 rounded-xl p-3"
      style={{
        background: 'rgba(255, 77, 143, 0.20)',
        boxShadow: 'inset 0 0 0 1px rgba(255, 77, 143, 0.40)'
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span
        className="anim-pulse mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: '#ff4d8f',
          boxShadow: '0 0 8px rgba(255, 77, 143, 0.85)'
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[13px] font-medium leading-[1.4] text-white">
          {alert.title}
        </span>
        <span
          className="text-meta-ghost w-full"
          style={{ letterSpacing: '0.08em', textTransform: 'none' }}
        >
          {alert.meta}
        </span>
      </div>
      {/* 置顶 = 告警:红色徽章只出现在这里(R12 剧本)。 */}
      <span
        className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[9.5px]"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.14em',
          borderColor: ALERT.alert.border,
          background: ALERT.alert.bg,
          color: ALERT.alert.color
        }}
      >
        {ALERT.alert.label}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="h-px w-full shrink-0"
      style={{
        background:
          'linear-gradient(90deg, transparent, rgba(180, 170, 255, 0.25), transparent)'
      }}
    />
  );
}

function alertRowStyle(level: Alert['level']): React.CSSProperties {
  if (level === 'responding') return { background: ALERT.responding.bg };
  if (level !== 'ai-insight') return {};
  return {
    background: 'rgba(139, 92, 246, 0.18)',
    boxShadow: 'inset 0 0 0 1px rgba(184, 164, 255, 0.28)'
  };
}

function alertRowClass(isFresh: boolean): string {
  const base = 'alert-row flex items-start gap-3 rounded-xl p-3 cursor-pointer';
  return isFresh ? `${base} alert-row-fresh` : base;
}

function handleKeyboardClick(onClick: (() => void) | undefined): React.KeyboardEventHandler | undefined {
  if (!onClick) return undefined;
  return (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
}

function AlertRow({
  alert,
  isFresh,
  onClick
}: {
  alert: Alert;
  isFresh: boolean;
  onClick?: () => void;
}) {
  return (
    <li
      className={alertRowClass(isFresh)}
      style={alertRowStyle(alert.level)}
      data-fresh={isFresh || undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyboardClick(onClick)}
    >
      <span
        className="text-meta-ghost shrink-0 pt-0.5 tabular-nums whitespace-nowrap"
        style={{ fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'none' }}
      >
        {relativeTime(alert.timestamp)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          {alert.level === 'responding' ? (
            <span
              className="anim-pulse h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background: ALERT.responding.dot,
                boxShadow: '0 0 8px rgba(77, 139, 255, 0.85)'
              }}
            />
          ) : null}
          {alert.level === 'ai-insight' ? (
            <Sparkles size={12} className="shrink-0 text-violet-200" />
          ) : null}
          <span className="min-w-0 flex-1 text-[13px] leading-[1.4] text-white/90">
            {alert.title}
          </span>
        </div>
        <span
          className="text-meta-ghost w-full"
          style={{ letterSpacing: '0.08em', textTransform: 'none' }}
        >
          {alert.meta}
        </span>
        {alert.aiSuggestion ? (
          <p className="mt-1 text-[11.5px] leading-[1.4] text-white/80">
            {alert.aiSuggestion.summary}
          </p>
        ) : null}
      </div>

      <Badge level={alert.level} />
    </li>
  );
}

function Badge({ level }: { level: Alert['level'] }) {
  const map = {
    responding: ALERT.responding,
    closed: ALERT.closed,
    'ai-insight': ALERT.insight
  } as const;
  const spec = map[level];
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[9.5px]"
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.14em',
        borderColor: spec.border,
        background: spec.bg,
        color: spec.color
      }}
    >
      {spec.label}
    </span>
  );
}

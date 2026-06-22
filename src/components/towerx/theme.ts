/**
 * Project theme — the seven brand color tokens, mirrored from
 * tailwind.config.js (which remains the source of truth for Tailwind
 * utility classes). JS / TS code that needs the same colors —
 * inline `style`, Three.js material `color`, shader uniforms, canvas
 * fill — should reference these string constants instead of repeating hex
 * literals, so the palette doesn't drift.
 *
 * If the palette ever changes, update both this file AND the
 * `theme.extend.colors` block in tailwind.config.js (kept in sync by
 * convention — Tailwind v3's JS config doesn't easily import TS).
 */
export const PALETTE = {
  /** Page backdrop base (darkest). */
  bg0: '#08041a',
  /** Page backdrop tint 1 (slightly lifted). */
  bg1: '#0a0518',
  /** Page backdrop tint 2 (warmest of the three darks). */
  bg2: '#120a28',
  /** Primary accent — radial backdrop, halo inner, atmosphere. */
  blue: '#4d8bff',
  /** Secondary accent — halo outer, radial backdrop end stop. */
  violet: '#8b5cf6',
  /** Alert / warning accent. Reserved for "wrong" states. */
  magenta: '#ff4d8f',
  /** Near-white foreground — body text + brightest 3D highlights. */
  fg: '#eef4ff'
} as const;

/**
 * Semantic status colors — used for state indicators (alert action
 * dots, LIVE pulse, status labels). Kept separate from PALETTE
 * because they're SEMANTIC (success / attention / warning), not
 * brand colors. Anyone introducing a "responding" state, an
 * "approved" pill, etc. should pull from here.
 *
 * `attention` is the lavender used by "recommended" action dots and
 * the text-grad gradient endpoint in index.css — kept in sync there
 * by convention.
 */
export const STATUS = {
  /** Success / completed / live. Used: LIVE pulse, "已执行" dot. */
  success: '#5fffb8',
  /** Attention / recommended / soft highlight. Used: "建议" dot. */
  attention: '#b8a4ff',
  /** Warning / monitoring / active observation. Used: "监控中" dot. */
  warning: '#ffb05c'
} as const;

/**
 * 告警行语义色(R12 剧本三色):
 *  - `alert`      告警 = 红。**只用于置顶危机卡**,红色只出现在最上面。
 *  - `responding` 进行中 = 蓝(基建冷色,运输在途)。列表里不再有红。
 *  - `closed`     已闭环/即将 = 绿(收束)。
 * 黄/金只留给左下唯一 ¥ 价值拍点。
 */
export const ALERT = {
  alert: {
    // 仅置顶危机卡用。红只出现在最上面这一处。
    label: '响应中',
    border: 'rgba(255, 90, 110, 0.55)',
    bg: 'rgba(255, 90, 110, 0.18)',
    color: '#ffd0d6',
    dot: '#ff5a6e'
  },
  responding: {
    // R12:列表中的「进行中」运输 = 蓝(非红)。红只属置顶告警。
    label: '进行中',
    border: 'rgba(77, 139, 255, 0.42)',
    bg: 'rgba(77, 139, 255, 0.12)',
    color: '#cfe0ff',
    dot: '#4d8bff'
  },
  closed: {
    label: '已闭环',
    border: 'rgba(134, 239, 172, 0.35)',
    bg: 'rgba(255, 255, 255, 0.02)',
    color: 'rgba(134, 239, 172, 0.85)'
  },
  insight: {
    label: 'AI 洞察',
    border: 'rgba(184, 164, 255, 0.55)',
    bg: 'rgba(139, 92, 246, 0.22)',
    color: '#e6dcff'
  }
} as const;

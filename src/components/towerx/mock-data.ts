/**
 * Single source of truth for the Control Tower demo data.
 *
 *  - `cities` / `routes`: the East Asia node + lane network. City
 *    display names are bare Chinese place names only — no RDC/AIR/港
 *    or category suffix (node role lives in `nodeType`).
 *  - `alerts`: the crisis line (currently just a-001, the Hong Kong
 *    storm reroute) — the only entry with an AI section.
 *  - `alertPool`: one logistics event per non-crisis route (p-001…
 *    p-031, exactly covering the 31 schedulable routes). All are
 *    `responding` / `closed`; the ambient engine surfaces them into
 *    the auto-scrolling feed over time.
 *  - `aiActions`: candidate pool for the bottom-left AI ACTION TICKER
 *    (single-line autonomy log, separate stream from the event feed).
 */

export type CityStatus = 'primary' | 'normal' | 'critical' | 'watch';
export type CityNodeType = 'factory' | 'supplier' | 'warehouse' | 'air-hub' | 'port';

export type City = {
  id: string;
  name: string;
  latDeg: number;
  lngDeg: number;
  nodeType: CityNodeType;
  status: CityStatus;
};

// 城市名统一标准:`name` 只放裸中文地名,不带 RDC/AIR/港/·类目
// 等任何后缀(节点类型由 `nodeType` 表达,不混进显示名)。
export const cities: City[] = [
  { id: 'shanghai',  name: '上海',   latDeg: 31.23, lngDeg: 121.47, nodeType: 'factory',   status: 'primary' },
  { id: 'beijing',   name: '北京',   latDeg: 39.90, lngDeg: 116.41, nodeType: 'factory',   status: 'normal' },
  { id: 'shenzhen',  name: '深圳',   latDeg: 22.54, lngDeg: 114.06, nodeType: 'factory',   status: 'normal' },
  { id: 'chengdu',   name: '成都',   latDeg: 30.57, lngDeg: 104.07, nodeType: 'factory',   status: 'normal' },
  { id: 'hangzhou',  name: '杭州',   latDeg: 30.27, lngDeg: 120.16, nodeType: 'warehouse', status: 'normal' },
  { id: 'guangzhou', name: '广州',   latDeg: 23.13, lngDeg: 113.26, nodeType: 'warehouse', status: 'normal' },
  { id: 'tokyo',     name: '东京',   latDeg: 35.68, lngDeg: 139.65, nodeType: 'warehouse', status: 'normal' },
  { id: 'xian',      name: '西安',   latDeg: 34.34, lngDeg: 108.94, nodeType: 'supplier',  status: 'normal' },
  { id: 'wuhan',     name: '武汉',   latDeg: 30.59, lngDeg: 114.31, nodeType: 'supplier',  status: 'normal' },
  { id: 'chongqing', name: '重庆',   latDeg: 29.56, lngDeg: 106.55, nodeType: 'supplier',  status: 'normal' },
  { id: 'taipei',    name: '台北',   latDeg: 25.03, lngDeg: 121.57, nodeType: 'supplier',  status: 'normal' },
  { id: 'osaka',     name: '大阪',   latDeg: 34.69, lngDeg: 135.50, nodeType: 'supplier',  status: 'normal' },
  { id: 'hongkong',  name: '香港',   latDeg: 22.32, lngDeg: 114.17, nodeType: 'air-hub',   status: 'critical' },
  { id: 'ningbo',    name: '宁波',   latDeg: 29.87, lngDeg: 121.54, nodeType: 'port',      status: 'normal' },
  { id: 'busan',     name: '釜山',   latDeg: 35.18, lngDeg: 129.08, nodeType: 'port',      status: 'normal' },
  { id: 'manila',    name: '马尼拉', latDeg: 14.60, lngDeg: 120.98, nodeType: 'port',      status: 'normal' },
  // R3#3 扩充东亚/东南亚版图(先多加,密度不对再减)。
  { id: 'seoul',     name: '首尔',   latDeg: 37.57, lngDeg: 126.98, nodeType: 'factory',   status: 'normal' },
  { id: 'hanoi',     name: '河内',   latDeg: 21.03, lngDeg: 105.85, nodeType: 'air-hub',   status: 'normal' },
  { id: 'hochiminh', name: '胡志明', latDeg: 10.82, lngDeg: 106.63, nodeType: 'port',      status: 'normal' },
  { id: 'bangkok',   name: '曼谷',   latDeg: 13.75, lngDeg: 100.50, nodeType: 'air-hub',   status: 'normal' },
  { id: 'kualalumpur', name: '吉隆坡', latDeg: 3.14, lngDeg: 101.69, nodeType: 'port',      status: 'normal' },
  { id: 'jakarta',   name: '雅加达', latDeg: -6.21, lngDeg: 106.85, nodeType: 'port',      status: 'normal' },
  // R4-3 角度变宽,再扩一批东亚节点(标签随连线显示,密度不杂乱)。
  { id: 'dalian',    name: '大连',   latDeg: 38.91, lngDeg: 121.61, nodeType: 'port',      status: 'normal' },
  { id: 'qingdao',   name: '青岛',   latDeg: 36.07, lngDeg: 120.38, nodeType: 'port',      status: 'normal' },
  { id: 'xiamen',    name: '厦门',   latDeg: 24.48, lngDeg: 118.09, nodeType: 'port',      status: 'normal' },
  { id: 'nagoya',    name: '名古屋', latDeg: 35.18, lngDeg: 136.91, nodeType: 'supplier',  status: 'normal' },
  { id: 'incheon',   name: '仁川',   latDeg: 37.46, lngDeg: 126.44, nodeType: 'air-hub',   status: 'normal' },
  { id: 'kaohsiung', name: '高雄',   latDeg: 22.62, lngDeg: 120.31, nodeType: 'port',      status: 'normal' },
  { id: 'danang',    name: '岘港',   latDeg: 16.05, lngDeg: 108.20, nodeType: 'port',      status: 'normal' },
  { id: 'phnompenh', name: '金边',   latDeg: 11.56, lngDeg: 104.92, nodeType: 'factory',   status: 'normal' }
];

export type RouteEmphasis = 'primary' | 'normal';
export type RouteStatus = 'normal' | 'critical' | 'watch';

export type Route = {
  id: string;
  source: string;
  target: string;
  emphasis: RouteEmphasis;
  status: RouteStatus;
};

export const routes: Route[] = [
  { id: 'shanghai-beijing',  source: 'shanghai',  target: 'beijing',   emphasis: 'primary', status: 'normal' },
  { id: 'shanghai-shenzhen', source: 'shanghai',  target: 'shenzhen',  emphasis: 'primary', status: 'normal' },
  { id: 'shanghai-chengdu',  source: 'shanghai',  target: 'chengdu',   emphasis: 'primary', status: 'normal' },
  { id: 'wuhan-shanghai',    source: 'wuhan',     target: 'shanghai',  emphasis: 'normal',  status: 'normal' },
  { id: 'xian-beijing',      source: 'xian',      target: 'beijing',   emphasis: 'normal',  status: 'normal' },
  { id: 'osaka-shanghai',    source: 'osaka',     target: 'shanghai',  emphasis: 'normal',  status: 'normal' },
  { id: 'taipei-shenzhen',   source: 'taipei',    target: 'shenzhen',  emphasis: 'normal',  status: 'normal' },
  { id: 'chongqing-chengdu', source: 'chongqing', target: 'chengdu',   emphasis: 'normal',  status: 'normal' },
  { id: 'hongkong-shanghai', source: 'hongkong',  target: 'shanghai',  emphasis: 'normal',  status: 'critical' },
  { id: 'shanghai-hangzhou', source: 'shanghai',  target: 'hangzhou',  emphasis: 'normal',  status: 'normal' },
  { id: 'shenzhen-guangzhou',source: 'shenzhen',  target: 'guangzhou', emphasis: 'normal',  status: 'normal' },
  { id: 'shanghai-ningbo',   source: 'shanghai',  target: 'ningbo',    emphasis: 'normal',  status: 'normal' },
  { id: 'shanghai-tokyo',    source: 'shanghai',  target: 'tokyo',     emphasis: 'normal',  status: 'normal' },
  { id: 'busan-shanghai',    source: 'busan',     target: 'shanghai',  emphasis: 'normal',  status: 'normal' },
  { id: 'taipei-tokyo',      source: 'taipei',    target: 'tokyo',     emphasis: 'normal',  status: 'normal' },
  { id: 'guangzhou-hongkong',source: 'guangzhou', target: 'hongkong',  emphasis: 'normal',  status: 'normal' },
  { id: 'beijing-tokyo',     source: 'beijing',   target: 'tokyo',     emphasis: 'normal',  status: 'normal' },
  // R9:把之前亮着却没连线的节点接进物流网(每条都有对应物流事件,
  // 会脉冲/出标签/进 feed)。无重复无序城市对,沿用 pair-dedupe。
  { id: 'seoul-shanghai',    source: 'seoul',     target: 'shanghai',  emphasis: 'normal',  status: 'normal' },
  { id: 'incheon-osaka',     source: 'incheon',   target: 'osaka',     emphasis: 'normal',  status: 'normal' },
  { id: 'dalian-shanghai',   source: 'dalian',    target: 'shanghai',  emphasis: 'normal',  status: 'normal' },
  { id: 'qingdao-shenzhen',  source: 'qingdao',   target: 'shenzhen',  emphasis: 'normal',  status: 'normal' },
  { id: 'xiamen-shenzhen',   source: 'xiamen',    target: 'shenzhen',  emphasis: 'normal',  status: 'normal' },
  { id: 'nagoya-shanghai',   source: 'nagoya',    target: 'shanghai',  emphasis: 'normal',  status: 'normal' },
  { id: 'kaohsiung-shenzhen',source: 'kaohsiung', target: 'shenzhen',  emphasis: 'normal',  status: 'normal' },
  { id: 'hanoi-shenzhen',    source: 'hanoi',     target: 'shenzhen',  emphasis: 'normal',  status: 'normal' },
  { id: 'hochiminh-guangzhou',source: 'hochiminh',target: 'guangzhou', emphasis: 'normal',  status: 'normal' },
  { id: 'bangkok-guangzhou', source: 'bangkok',   target: 'guangzhou', emphasis: 'normal',  status: 'normal' },
  { id: 'kualalumpur-shenzhen',source:'kualalumpur',target:'shenzhen', emphasis: 'normal',  status: 'normal' },
  { id: 'jakarta-guangzhou', source: 'jakarta',   target: 'guangzhou', emphasis: 'normal',  status: 'normal' },
  { id: 'manila-hongkong',   source: 'manila',    target: 'hongkong',  emphasis: 'normal',  status: 'normal' },
  { id: 'danang-shenzhen',   source: 'danang',    target: 'shenzhen',  emphasis: 'normal',  status: 'normal' },
  { id: 'phnompenh-guangzhou',source:'phnompenh', target: 'guangzhou', emphasis: 'normal',  status: 'normal' }
];

export type AlertLevel = 'responding' | 'closed' | 'ai-insight';

/** Status of an autonomous step the AI took or proposed for an alert. */
export type AlertActionStatus = 'taken' | 'recommended' | 'monitoring';

export type AlertAction = {
  label: string;
  status: AlertActionStatus;
};

export type Alert = {
  id: string;
  /** Unix ms — render via `relativeTime(timestamp)` for "刚刚 / N 分钟前". */
  timestamp: number;
  title: string;
  meta: string;
  level: AlertLevel;
  /** Globe nodes this event touches. Drives click-to-highlight. */
  cityIds: string[];
  /** Optional route id when the event is about a specific lane. */
  routeId?: string;
  /** Detail-panel narrative — one short paragraph framing what AI saw.
   *  渲染在「现在事件」区(事件现状),不再是 AI 区的一部分。 */
  insight?: string;
  /** Detail-panel autonomous-action ledger — what AI did or proposes.
   *  渲染在 AI 区的「方案」部分。 */
  actions?: AlertAction[];
  /** AI 区「预测」部分:一句前瞻判断(若 AI 不干预/已闭环会怎样、
   *  风险窗口等)。缺省则详情不显示「预测」小节(R3#5)。 */
  forecast?: string;
  /** Only set on `ai-insight` rows — populates the beam-shimmer card. */
  aiSuggestion?: {
    summary: string;
    confidence: number;
    actions: { label: string; primary?: boolean }[];
  };
  /** 危机详情四拍叙事(spec §10)。仅危机 alert 设置;普通事件缺省
   *  → 走原非危机详情分支,零影响。 */
  /** 拍1 问题:受影响下游,2–4 行极短,等宽呈现。 */
  downstream?: string[];
  /** 拍2 推理:内容驱动的推理碎片,逐行流入(取代写死假 spinner)。 */
  reasoning?: string[];
  /** 拍3 计划:华中空运中继;金额作卡内可读论据,非 overlay。 */
  plan?: {
    route: string;
    costDelta: string;
    avoidedLoss: string;
    confidence: number;
  };
};

// "Now" for the crisis alert is captured at module load — the relative
// time renderer compares against the system clock at render. a-001 is
// seeded ~3 minutes ago. Ambient feed material comes from `alertPool`
// below (its timestamps are stamped by the ambient engine, not here).
const NOW = Date.now();
const m = (n: number) => NOW - n * 60_000;

export const alerts: Alert[] = [
  {
    id: 'a-001',
    timestamp: m(3),
    title: '香港 → 上海 空运中转重排',
    meta: 'SOP-A47 · 4 batches · ETA +24m',
    level: 'responding',
    cityIds: ['hongkong', 'shanghai'],
    routeId: 'hongkong-shanghai',
    insight:
      '香港赤鱲角终端区雷达检出雷暴单体接近，AI 推演 90 min 内 4 个出港波次受影响，已启动空运备份链路。',
    actions: [
      { label: '4 班空运改走武汉中继', status: 'taken' },
      { label: '通知 3 家承运商运力调整', status: 'taken' },
      { label: '宁波港海运备份预热', status: 'monitoring' }
    ],
    forecast:
      '若维持当前预案,雷暴窗口内 ETA 偏差控制在 +24m;若 90 min 后未消散,AI 将自动切宁波海运,成本 +¥2.1M、ETA +18h。',
    // 危机四拍叙事(spec §10.2/§10.3;文案为真机起点)
    downstream: [
      '北京 RDC · 华北 3 仓 D+2 缺货风险',
      '首尔联程 · 14 票后续航段滞留',
      '东京 JIT · 2 客户线边库存 < 8h'
    ],
    reasoning: [
      'HKG→PVG 受台风外围地停 · 预计 +72h',
      '替代:HKG→WUH 空运中继 · WUH→PVG 补位',
      '净影响:成本 +¥1.2M / 规避损失 ¥18.4M'
    ],
    plan: {
      route: '华中空运中继 · HKG→WUH 空运 + WUH→PVG 补位',
      costDelta: '+¥1.2M',
      avoidedLoss: '¥18.4M',
      confidence: 0.94
    }
  }
];

export { alertPool } from './mock-alert-pool';

/**
 * Single-line autonomous AI activity stream for the bottom-left ticker.
 * Different vocabulary from `alerts` — these are things the AI has
 * actively done, not events it is reacting to.
 */
export const aiActions: string[] = [
  'AI 已为广州 RDC 重排 2 班空运',
  'AI 切换上海 ↔ 釜山备用航线',
  'AI 下发 RFQ 给 4 家承运商',
  'AI 自动校验台北→深圳晶圆批次',
  'AI 已锁定杭州 RDC 应急通道',
  'AI 完成长三角 RDC 99.2% 闭环',
  'AI 调度 +12 班釜山港轮班',
  'AI 重计算东京 RDC 库存阈值',
  'AI 拒绝 1 笔异常承运报价 (高 31%)',
  'AI 自动重排 4 班空运备件',
  'AI 模拟 6 条备选航线 (1.4s)',
  'AI 已生成本周供应链周报',
  'AI 监测香港空运 SLA 实时',
  'AI 切回宁波港海运 (cost −¥2.1M)',
  'AI 已通知 3 家承运商运力变化'
];

/** Format `timestamp` as a short Chinese relative time string. */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - ts) / 1000));
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

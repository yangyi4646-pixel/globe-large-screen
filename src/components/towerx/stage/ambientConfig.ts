/**
 * 环境引擎节律 — 单处可调。spec §7 把这些值的最终确定留给 Phase 1
 * 实现期。改这里即可调「系统呼吸」的快慢/密度,不碰引擎逻辑。
 */
export const AMBIENT = {
  /** 恒定脉冲的危机线(唯一常量线,不计入并发上限)。
   *  Phase 2: 兜底值，客户实际由 useTowerXConfig().crisis.routeId 注入；
   *  ambientEngine 通过 buildAmbientConfig(routeId) 构造运行时配置覆盖此值。 */
  crisisRouteId: 'hongkong-shanghai',
  /** 非危机线同时最多几条活跃。R11:地图脉冲与 feed 解耦后回到 6,
   *  线更多更随机(再配合端点分散,不聚堆)。 */
  maxConcurrentPulses: 6,
  /** 每条非危机脉冲寿命(ms):跑一趟的总时长,到点即灭。 */
  pulseLifetimeMs: 4200,
  /** 脉冲生成间隔(ms,均匀随机)。R11:回到较快 —— 这只控地图
   *  连线密度;feed 上新由下面的 feedMinIntervalMs 单独节流。 */
  spawnIntervalMinMs: 800,
  spawnIntervalMaxMs: 1900,
  /** R11:feed 上新最小间隔(ms)。脉冲在地图上密集闪现,但右侧
   *  列表两条新行之间至少隔这么久 —— 解耦"地图热闹"与"feed 可读"。 */
  feedMinIntervalMs: 3800,
  /** 列表同步行上限(置顶危机卡之外)。R5-3:7→12 填满右面板,
   *  消除下方留白。12 = 现有「每行都对应真实航线」的去重事件上限
   *  (再多需重复航线,与 R3#3 一致性原则冲突,故 12 为自然封顶)。 */
  maxSurfacedRows: 12
} as const;

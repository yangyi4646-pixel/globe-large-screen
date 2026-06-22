import type { Alert } from './mock-data';

/**
 * 环境引擎随时间浮现的事件池。R7:全部为**物流/运输**事件,且每条
 * 都绑定一条真实航线(`routeId`)—— 右侧面板只展示与连线相关的物流
 * 数据,不含库存/仓内/劳力/QA 等非运输项。普通事件无 AI 区(详情
 * 只给物流信息);AI 仅属危机线(`alerts` 里的 a-001)。
 * 一航线一事件,覆盖全部非危机可调度航线,种子据此填满面板。
 */
export const alertPool: Alert[] = [
  {
    id: 'p-001',
    timestamp: 0,
    title: '大阪 → 上海 海运延误 +6 h',
    meta: 'weather · auto-rerouted',
    level: 'responding',
    cityIds: ['osaka', 'shanghai'],
    routeId: 'osaka-shanghai',
    insight: '日本海气旋外围影响大阪港离港,已重排为海+空混合运输降低 ETA 损失。'
  },
  {
    id: 'p-002',
    timestamp: 0,
    title: '上海 → 东京 空运舱位重排',
    meta: 'air · 3 batches',
    level: 'responding',
    cityIds: ['shanghai', 'tokyo'],
    routeId: 'shanghai-tokyo',
    insight: '上海浦东出港时刻收紧,已将 3 个波次改签早班并锁定备份舱位。'
  },
  {
    id: 'p-003',
    timestamp: 0,
    title: '上海 → 杭州 干线时效偏移 +38 min',
    meta: 'highway · within P95',
    level: 'closed',
    cityIds: ['shanghai', 'hangzhou'],
    routeId: 'shanghai-hangzhou',
    insight: '沪杭干线早高峰时效偏移 +38 min,仍在 P95 容差内,持续监控不干预。'
  },
  {
    id: 'p-004',
    timestamp: 0,
    title: '釜山 → 上海 海运恢复 SLA',
    meta: 'capacity · 102% nominal',
    level: 'closed',
    cityIds: ['busan', 'shanghai'],
    routeId: 'busan-shanghai',
    insight: '釜山发上海海运班期已恢复 102% 标称容量,超载缓冲填补前两日积压。'
  },
  {
    id: 'p-005',
    timestamp: 0,
    title: '深圳 → 广州 干线节流',
    meta: 'highway · advisory',
    level: 'responding',
    cityIds: ['shenzhen', 'guangzhou'],
    routeId: 'shenzhen-guangzhou',
    insight: '广深高速发布临时管控,已为 8 车干线段分流至深惠高速。'
  },
  {
    id: 'p-006',
    timestamp: 0,
    title: '武汉 → 上海 跨线调拨 2 批',
    meta: 'reroute · 2 batches',
    level: 'responding',
    cityIds: ['wuhan', 'shanghai'],
    routeId: 'wuhan-shanghai',
    insight: '武汉发上海干线运力缺口,已协调跨线调拨 2 批补足班期。'
  },
  {
    id: 'p-007',
    timestamp: 0,
    title: '台北 → 深圳 晶圆调拨',
    meta: 'dispatch · 3 lots',
    level: 'closed',
    cityIds: ['taipei', 'shenzhen'],
    routeId: 'taipei-shenzhen',
    insight: '台北→深圳晶圆 3 lots 调拨闭环,优化承运商组合节省 9% 成本。'
  },
  {
    id: 'p-008',
    timestamp: 0,
    title: '北京 → 东京 空运舱位预订',
    meta: 'auto-bid · 4 carriers',
    level: 'closed',
    cityIds: ['beijing', 'tokyo'],
    routeId: 'beijing-tokyo',
    insight: '自动竞价 4 家承运商,锁定北京→东京舱位,单价低于 spot 11%。'
  },
  {
    id: 'p-009',
    timestamp: 0,
    title: '上海 → 成都 干线时效偏移 +42 min',
    meta: 'monitor · within tolerance',
    level: 'closed',
    cityIds: ['shanghai', 'chengdu'],
    routeId: 'shanghai-chengdu',
    insight: '上海→成都干线时效偏移 +42 min,仍在 P95 容差内,持续监控。'
  },
  {
    id: 'p-010',
    timestamp: 0,
    title: '上海 → 深圳 拼柜启动',
    meta: 'LCL · 12 shippers',
    level: 'closed',
    cityIds: ['shanghai', 'shenzhen'],
    routeId: 'shanghai-shenzhen',
    insight: '自动撮合 12 货主拼柜启动,上海→深圳 LCL 班期成本下降 23%。'
  },
  {
    id: 'p-011',
    timestamp: 0,
    title: '重庆 → 成都 整车调拨',
    meta: 'dispatch · 24 units',
    level: 'closed',
    cityIds: ['chongqing', 'chengdu'],
    routeId: 'chongqing-chengdu',
    insight: '重庆→成都整车干线调拨 24 台闭环,班期准点。'
  },
  {
    id: 'p-012',
    timestamp: 0,
    title: '广州 → 香港 跨境通关预警',
    meta: 'customs · monitoring',
    level: 'responding',
    cityIds: ['guangzhou', 'hongkong'],
    routeId: 'guangzhou-hongkong',
    insight: '广州→香港跨境通关时长升至 P85,已预备文件加急通道并持续监控。'
  },
  {
    id: 'p-013',
    timestamp: 0,
    title: '上海 → 北京 空运改期',
    meta: 'air · slot shift',
    level: 'responding',
    cityIds: ['shanghai', 'beijing'],
    routeId: 'shanghai-beijing',
    insight: '上海→北京空运受流控影响,已将 2 个波次改签并通知收货端调整窗口。'
  },
  {
    id: 'p-014',
    timestamp: 0,
    title: '西安 → 北京 干线整合',
    meta: 'consolidation · 2→1',
    level: 'closed',
    cityIds: ['xian', 'beijing'],
    routeId: 'xian-beijing',
    insight: '西安→北京干线两班整合为一班直达,装载率提升至 94%。'
  },
  {
    id: 'p-015',
    timestamp: 0,
    title: '上海 → 宁波 支线转运',
    meta: 'feeder · on schedule',
    level: 'closed',
    cityIds: ['shanghai', 'ningbo'],
    routeId: 'shanghai-ningbo',
    insight: '上海→宁波支线转运班期准点,衔接远洋干线无积压。'
  },
  {
    id: 'p-016',
    timestamp: 0,
    title: '台北 → 东京 空运直达',
    meta: 'air · direct',
    level: 'closed',
    cityIds: ['taipei', 'tokyo'],
    routeId: 'taipei-tokyo',
    insight: '台北→东京空运直达班期恢复,前序延误已消化。'
  },
  {
    id: 'p-017',
    timestamp: 0,
    title: '首尔 → 上海 空运舱位锁定',
    meta: 'air · 2 batches',
    level: 'closed',
    cityIds: ['seoul', 'shanghai'],
    routeId: 'seoul-shanghai',
    insight: '首尔→上海空运 2 个波次舱位已锁定,班期准点无积压。'
  },
  {
    id: 'p-018',
    timestamp: 0,
    title: '仁川 → 大阪 支线转运',
    meta: 'feeder · on schedule',
    level: 'closed',
    cityIds: ['incheon', 'osaka'],
    routeId: 'incheon-osaka',
    insight: '仁川→大阪支线转运班期准点,衔接跨太平洋干线无延误。'
  },
  {
    id: 'p-019',
    timestamp: 0,
    title: '大连 → 上海 海运班期重排',
    meta: 'sea · auto-rerouted',
    level: 'responding',
    cityIds: ['dalian', 'shanghai'],
    routeId: 'dalian-shanghai',
    insight: '渤海湾大风影响大连离港,已重排 3 班海运并启用沿海支线补位。'
  },
  {
    id: 'p-020',
    timestamp: 0,
    title: '青岛 → 深圳 干线整合',
    meta: 'consolidation · 2→1',
    level: 'closed',
    cityIds: ['qingdao', 'shenzhen'],
    routeId: 'qingdao-shenzhen',
    insight: '青岛→深圳两班干线整合为一班直达,装载率提升至 93%。'
  },
  {
    id: 'p-021',
    timestamp: 0,
    title: '厦门 → 深圳 拼柜启动',
    meta: 'LCL · 9 shippers',
    level: 'closed',
    cityIds: ['xiamen', 'shenzhen'],
    routeId: 'xiamen-shenzhen',
    insight: '自动撮合 9 货主拼柜启动,厦门→深圳 LCL 班期成本下降 17%。'
  },
  {
    id: 'p-022',
    timestamp: 0,
    title: '名古屋 → 上海 精密件空运',
    meta: 'air · 4 lots',
    level: 'responding',
    cityIds: ['nagoya', 'shanghai'],
    routeId: 'nagoya-shanghai',
    insight: '名古屋精密件 4 lots 走空运优先通道,已锁定早班舱位守住 ETA。'
  },
  {
    id: 'p-023',
    timestamp: 0,
    title: '高雄 → 深圳 海运转运',
    meta: 'sea · on schedule',
    level: 'closed',
    cityIds: ['kaohsiung', 'shenzhen'],
    routeId: 'kaohsiung-shenzhen',
    insight: '高雄→深圳海运转运班期准点,衔接华南干线无积压。'
  },
  {
    id: 'p-024',
    timestamp: 0,
    title: '河内 → 深圳 跨境干线',
    meta: 'cross-border · monitoring',
    level: 'responding',
    cityIds: ['hanoi', 'shenzhen'],
    routeId: 'hanoi-shenzhen',
    insight: '河内→深圳跨境干线通关时长升至 P80,已预备加急通道并持续监控。'
  },
  {
    id: 'p-025',
    timestamp: 0,
    title: '胡志明 → 广州 海运拼柜',
    meta: 'LCL · 14 shippers',
    level: 'closed',
    cityIds: ['hochiminh', 'guangzhou'],
    routeId: 'hochiminh-guangzhou',
    insight: '胡志明→广州 LCL 拼柜启动,14 货主撮合,班期成本下降 21%。'
  },
  {
    id: 'p-026',
    timestamp: 0,
    title: '曼谷 → 广州 空运改期',
    meta: 'air · slot shift',
    level: 'responding',
    cityIds: ['bangkok', 'guangzhou'],
    routeId: 'bangkok-guangzhou',
    insight: '曼谷出港流控收紧,已将 2 个波次改签并通知收货端调整窗口。'
  },
  {
    id: 'p-027',
    timestamp: 0,
    title: '吉隆坡 → 深圳 海运恢复 SLA',
    meta: 'capacity · 101% nominal',
    level: 'closed',
    cityIds: ['kualalumpur', 'shenzhen'],
    routeId: 'kualalumpur-shenzhen',
    insight: '吉隆坡→深圳海运班期恢复 101% 标称容量,前两日积压已消化。'
  },
  {
    id: 'p-028',
    timestamp: 0,
    title: '雅加达 → 广州 海运班期重排',
    meta: 'sea · auto-rerouted',
    level: 'responding',
    cityIds: ['jakarta', 'guangzhou'],
    routeId: 'jakarta-guangzhou',
    insight: '爪哇海风浪影响雅加达离港,已重排为海+空混合运输降低 ETA 损失。'
  },
  {
    id: 'p-029',
    timestamp: 0,
    title: '马尼拉 → 香港 空运转运',
    meta: 'air · feeder',
    level: 'closed',
    cityIds: ['manila', 'hongkong'],
    routeId: 'manila-hongkong',
    insight: '马尼拉→香港空运支线转运班期准点,衔接香港国际枢纽无延误。'
  },
  {
    id: 'p-030',
    timestamp: 0,
    title: '岘港 → 深圳 干线节流',
    meta: 'highway · advisory',
    level: 'responding',
    cityIds: ['danang', 'shenzhen'],
    routeId: 'danang-shenzhen',
    insight: '岘港跨境干线发布临时管控,已为 6 车分流至备用口岸。'
  },
  {
    id: 'p-031',
    timestamp: 0,
    title: '金边 → 广州 整车调拨',
    meta: 'dispatch · 18 units',
    level: 'closed',
    cityIds: ['phnompenh', 'guangzhou'],
    routeId: 'phnompenh-guangzhou',
    insight: '金边→广州整车干线调拨 18 台闭环,班期准点。'
  }
];

import { cities, type Alert } from '../mock-data';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// id → 中文地名,让详情「节点」行与全局城市名标准一致(不再露
// 出 hongkong / shanghai 这类原始 id)。
const CITY_NAME: Record<string, string> = Object.fromEntries(
  cities.map((c) => [c.id, c.name])
);

const CARRIERS = ['COSCO', 'OOCL', 'EVA AIR', 'CES', 'SF', 'CK', 'YTO', 'MSK'];
const MODES: Record<string, string> = {
  air: '空运',
  sea: '海运',
  highway: '干线',
  feeder: '支线转运',
  dispatch: '整车调拨',
  LCL: '拼柜',
  customs: '跨境通关',
  reroute: '改道',
  consolidation: '干线整合',
  monitor: '监控'
};

export function logisticsRows(alert: Alert): { k: string; v: string }[] {
  const h = hashStr(alert.id.replace(/-amb\d+$|-seed\d+$/, '') + alert.routeId);
  // 全部用无符号右移 + 取正模,避免负索引/负数(否则出现 WB-0/4397
  // 这种乱码)。d(salt,n) 稳定取 [0,n) 内的正整数。
  const d = (salt: number, n: number) => ((h >>> salt) % n + n) % n;
  const pick = <T,>(arr: T[], salt: number) => arr[d(salt, arr.length)];
  const metaHead = (alert.meta.split('·')[0] || '').trim().toLowerCase();
  const modeKey = Object.keys(MODES).find((k) =>
    metaHead.includes(k.toLowerCase())
  );
  const mode = modeKey ? MODES[modeKey] : '多式联运';
  const carrier = pick(CARRIERS, 3);
  const flightNo =
    String.fromCharCode(65 + d(5, 26)) +
    String.fromCharCode(65 + d(9, 26)) +
    (1000 + d(0, 8999));
  const teu = 6 + d(2, 40);
  const etaH = d(7, 24);
  const etaM = d(11, 12) * 5;
  const dPlus = 1 + d(13, 4);
  const onTime = (94 + d(15, 60) / 10).toFixed(1);
  const costSign = d(17, 2) ? '+' : '−';
  const costM = (d(18, 45) / 10 + 0.4).toFixed(1);
  const node =
    (alert.cityIds || []).map((cid) => CITY_NAME[cid] ?? cid).join(' · ') ||
    alert.routeId ||
    '—';
  return [
    { k: '运单', v: `WB-${flightNo}` },
    { k: '承运', v: carrier },
    { k: '模式', v: mode },
    { k: '货量', v: mode === '空运' ? `${teu} 票` : `${teu} TEU` },
    {
      k: '班期 ETA',
      v: `${String(etaH).padStart(2, '0')}:${String(etaM).padStart(2, '0')} · D+${dPlus}`
    },
    { k: '准点率', v: `${onTime}%` },
    { k: '成本 Δ', v: `${costSign}¥${costM}M` },
    { k: '节点', v: node }
  ];
}

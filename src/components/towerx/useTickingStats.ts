import { useEffect, useState } from 'react';

/**
 * useSavedValue — 唯一价值拍点的数字源。¥ 规避损失每 ~25s 缓慢爬升,
 * 读作移动的头条金额。uptime / AI acts 随 KPI 卡一并移除(PRODUCT.md
 * 「氛围>信息」:读起来像数据墙的优先砍)。
 */
export function useSavedValue(): string {
  const [savedM, setSavedM] = useState(12.4);
  useEffect(() => {
    const s = window.setInterval(() => {
      setSavedM((n) => +(n + Math.random() * 0.15).toFixed(1));
    }, 25000);
    return () => window.clearInterval(s);
  }, []);
  return `¥ ${savedM.toFixed(1)}M`;
}

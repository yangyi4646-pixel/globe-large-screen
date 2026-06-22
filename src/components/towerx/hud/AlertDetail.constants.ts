// 危机四拍编排节奏(spec §10.3 / §10 R3;真机起点,回写 §10.6)。
// R3:用户「推理跟实施都太快」→ 全线放慢 + 新增「执行中」重量拍。
export type CrisisPhase =
  | 'problem'
  | 'reasoning'
  | 'plan'
  | 'executing'
  | 'executed';

// R3/§10 R8:用户「推理跟执行还是太快」→ 再放慢;EXEC 拉长到能
// 容纳地球愈合动画(Slice2a:人按 → 危机线 magenta→blue + HK 环平息)。
// 问题→推理 改为手动(「AI 推理」按钮),无自动停留常量。
export const REASONING_LINE_MS = 1800; // 推理碎片逐行流入间隔(一条条想清楚)
export const REASONING_DONE_HOLD_MS = 900; // 推理流完 → 计划(停顿后给方案)
export const EXEC_HOLD_MS = 2600; // 人按 → 「执行中」→ 已实施(同时地球愈合)

// 详情面板统一字号分级(spec §10.6)。**勿再散落 inline fontSize**;
// 新文本一律套这五级之一。数据型(运单/推理/金额)再叠 MONO。
export const TXT = {
  // 标题用 Tailwind text-xl,不在此表(唯一)。
  body: 'text-[14px] leading-[1.55] text-white/90', // 现在事件正文 / 计划路线
  data: 'text-[13px] leading-[1.5] text-white/85', // 下游/推理/运单/金额/已实施
  label: 'text-[11px] tracking-[0.18em] text-white/55', // Section/meta/格栅键
  micro: 'text-[10px] tracking-[0.20em] text-white/45' // ›开关 / CONF / 角标
} as const;

export const MONO = 'JetBrains Mono, monospace';

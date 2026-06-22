import type { Alert } from '../mock-data';

/**
 * 舞台状态机 — demo「此刻在演什么」的唯一真相源。纯函数,无 React、
 * 无副作用,可独立推理。Phase 1 只含 REST/DETAIL(取代 App 散落的
 * selectedAlert);FOCUS 在 Phase 2 随镜头聚焦加入。
 */
export type Stage =
  | { kind: 'rest' }
  | { kind: 'detail'; alert: Alert };

export type StageAction =
  | { type: 'openDetail'; alert: Alert }
  | { type: 'reset' };

export const initialStage: Stage = { kind: 'rest' };

export function stageReducer(_stage: Stage, action: StageAction): Stage {
  switch (action.type) {
    case 'openDetail':
      return { kind: 'detail', alert: action.alert };
    case 'reset':
      return { kind: 'rest' };
  }
}

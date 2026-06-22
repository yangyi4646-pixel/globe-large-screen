import { useReducer } from 'react';
import type { Alert } from '../mock-data';
import { initialStage, stageReducer } from './stageMachine';

/**
 * useStage — 把 stageReducer 包成可消费 hook。App 作根态持有,
 * 替掉散落的 selectedAlert。隐藏的球体编辑器(view:'editor')与本
 * 状态机正交,不在此处。
 */
export function useStage() {
  const [stage, dispatch] = useReducer(stageReducer, initialStage);
  return {
    stage,
    openDetail: (alert: Alert) => dispatch({ type: 'openDetail', alert }),
    reset: () => dispatch({ type: 'reset' })
  };
}

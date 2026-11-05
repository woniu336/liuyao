import { BoardState, PalaceNumber, ZhengTuiChain, ZhengTuiNode } from './types';
import { GUA_TO_PALACE, PALACE_NAMES } from './constants';
import { judgePalace } from './judgeEngine';

/**
 * 追踪小成图正推因果链（气路链 DAG）
 * 原理：从用神宫出发，看天盘何卦；该天盘卦归其地盘本宫，再看该宫天盘何卦；
 * 如此层层正推因果，直至闭环（成环）或归中宫止。
 */
export function traceZhengTuiChain(board: BoardState, startPalace: PalaceNumber): ZhengTuiChain {
  const path: PalaceNumber[] = [startPalace];
  const visited = new Set<PalaceNumber>([startPalace]);
  let curr = startPalace;
  let hasCycle = false;
  let endReason: 'guiwei' | 'cycle' | 'center' | 'open' = 'open';

  for (let step = 0; step < 8; step++) {
    const heavenGua = board.heaven[curr];
    // 中宫不落八方
    if (curr === 5 || !heavenGua) {
      endReason = curr === 5 ? 'center' : 'open';
      break;
    }

    const nextPalace = GUA_TO_PALACE[heavenGua];
    if (!nextPalace) break;

    // 归位：天盘卦即本宫地盘卦 —— 气止得位，是终局，不是闭环。
    // 旧实现把两者都算作 hasCycle，会把「事已归元」误报成「矛盾自缠」。
    if (nextPalace === curr) {
      endReason = 'guiwei';
      break;
    }

    if (visited.has(nextPalace)) {
      path.push(nextPalace);
      hasCycle = true;
      endReason = 'cycle';
      break;
    }

    path.push(nextPalace);
    visited.add(nextPalace);
    curr = nextPalace;

    if (curr === 5) {
      endReason = 'center';
      break;
    }
  }

  // 构造沿途节点判语
  const nodes: ZhengTuiNode[] = path.map((palace, idx) => {
    const judgment = judgePalace(board, palace);
    const isLoopOrEnd =
      idx === path.length - 1 && (hasCycle || palace === 5 || endReason === 'guiwei');
    return {
      palace,
      palaceName: PALACE_NAMES[palace],
      heaven: board.heaven[palace],
      judgment,
      isLoopOrEnd,
    };
  });

  // 构造摘要
  const stepTexts = nodes.map((n, i) => {
    // 起手即止（归位 / 中宫 / 天盘缺卦）：只有一站，不能说成「起因」就完事
    if (i === 0 && nodes.length === 1) {
      if (endReason === 'guiwei') {
        return `【起手归位·气止】${n.palaceName}天盘即本宫地盘，卦归本位，气机无待演化`;
      }
      if (n.palace === 5) {
        return `【用神在中宫】${n.palaceName}立极归藏·${n.heaven}`;
      }
      return `【起因/用神】${n.palaceName}(${n.judgment.hexName || n.heaven})·${n.judgment.verdict}（气路未成链）`;
    }
    if (i === 0) {
      return `【起因/用神】${n.palaceName}(${n.judgment.hexName || n.heaven})·${n.judgment.verdict}`;
    }
    if (i === nodes.length - 1 && endReason === 'guiwei') {
      return `【归位·气止】${n.palaceName}天盘即本宫地盘，卦归本位，气机释放完毕`;
    }
    if (i === nodes.length - 1 && hasCycle) {
      return `【闭环成因】归至${n.palaceName}形成气路因果循环`;
    }
    if (i === nodes.length - 1 && n.palace === 5) {
      return `【最终归宿】气归中五宫(立极归藏)·${n.heaven}`;
    }
    return `【演化第${i}阶段】转入${n.palaceName}(${n.judgment.hexName})·${n.judgment.verdict}`;
  });

  const summary = stepTexts.join(' ➔ ');

  return {
    startPalace,
    nodes,
    path,
    hasCycle,
    endReason,
    summary,
  };
}

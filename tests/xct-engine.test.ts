/**
 * 小成图引擎自证：
 *  1. 64×64 种本卦/之卦组合都能排出九宫，并给出合法的四象八断；
 *  2. 中宫恒为「归藏之枢」，八方断语必在八断集合内；
 *  3. 任一起点宫位的正推链都能收敛（归位 / 闭环 / 归藏 / 链止），不会死循环；
 *  4. 天地数、梅花时间两种起卦法可由固定输入复现。
 */
import { describe, expect, it } from 'vitest';
import { ALL_TRIGRAMS, FOUR_IMAGES_VERDICTS } from '../lib/xct/constants';
import { buildBoard, buildBoardFromMeihuaTime, buildBoardFromTianDiNumbers } from '../lib/xct/boardBuilder';
import { judgeFullBoard } from '../lib/xct/judgeEngine';
import { traceZhengTuiChain } from '../lib/xct/dagTracker';
import type { PalaceNumber, Trigram } from '../lib/xct/types';

const LEGAL = new Set<string>(['归藏之枢', '归位']);
for (const info of Object.values(FOUR_IMAGES_VERDICTS)) {
  LEGAL.add(info.matched);
  LEGAL.add(info.unmatched);
}

describe('小成图 · 九宫与正推', () => {
  it('4096 种卦象组合 × 9 宫都能判决，且正推链可收敛', () => {
    for (const bu of ALL_TRIGRAMS) {
      for (const bl of ALL_TRIGRAMS) {
        for (const zu of ALL_TRIGRAMS) {
          for (const zl of ALL_TRIGRAMS) {
            const board = buildBoard(
              { upper: bu as Trigram, lower: bl as Trigram },
              { upper: zu as Trigram, lower: zl as Trigram },
            );
            const judgments = judgeFullBoard(board);
            for (let p = 1; p <= 9; p += 1) {
              const j = judgments[p as PalaceNumber];
              expect(LEGAL.has(j.verdict)).toBe(true);
              if (p === 5) expect(j.verdict).toBe('归藏之枢');
            }
            // 任一起点都能收敛
            for (let p = 1; p <= 9; p += 1) {
              const chain = traceZhengTuiChain(board, p as PalaceNumber);
              expect(chain.path.length).toBeGreaterThan(0);
              expect(chain.path.length).toBeLessThanOrEqual(9);
              expect(['guiwei', 'cycle', 'center', 'open']).toContain(chain.endReason);
            }
          }
        }
      }
    }
  }, 30_000);

  it('中宫恒为天地归藏，八宫天盘取自本卦/之卦/互卦', () => {
    const board = buildBoard({ upper: '乾', lower: '兑' }, { upper: '离', lower: '坤' });
    expect(board.heaven[9]).toBe('乾');
    expect(board.heaven[1]).toBe('兑');
    expect(board.heaven[3]).toBe('离');
    expect(board.heaven[7]).toBe('坤');
    expect(board.center).toBe(board.heaven[5]);
    const judgments = judgeFullBoard(board);
    expect(judgments[5].verdict).toBe('归藏之枢');
    expect(judgments[9].hexName).toBeTruthy();
  });

  it('天地数起卦可由四数复现（0–9 映射先天八卦）', () => {
    const a = buildBoardFromTianDiNumbers([1, 1, 4, 6]);
    const b = buildBoardFromTianDiNumbers([11, 21, 4, 6]); // 取模到同余
    expect(a.heaven).toEqual(b.heaven);
    expect(a.ben).toEqual(b.ben);
    expect(a.zhi).toEqual(b.zhi);
  });

  it('梅花时间起卦对固定时刻可复现，且动爻在 1..6', () => {
    const res = buildBoardFromMeihuaTime('2026-11-05T12:00:00');
    expect(res.movingYao).toBeGreaterThanOrEqual(1);
    expect(res.movingYao).toBeLessThanOrEqual(6);
    expect(res.board.ben).toEqual(buildBoardFromMeihuaTime('2026-11-05T12:00:00').board.ben);
    expect(res.timeInfo.ganzhiStr).toContain('年');
  });
});

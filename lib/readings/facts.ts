/**
 * 盘面事实打包（客户端安全，纯函数）。
 *
 * 这些函数产出的对象就是「允许离开浏览器」的全部内容：
 * 卦名、纳甲、六亲、世应、动变、伏神、旬空、神煞、九宫断语、正推链。
 * 不含用神推断、不含 prompt、不含任何环境变量。
 */

import type { LiuyaoChart } from '@/lib/liuyao/najia';
import type { CastTimeInfo } from '@/lib/liuyao/ganzhi';
import type { BoardState, PalaceJudgment, PalaceNumber, ZhengTuiChain } from '@/lib/xct/types';
import { PALACE_NAMES, SIXTY_FOUR_HEXAGRAMS } from '@/lib/xct/constants';
import { calcGuShiShenSha } from '@/lib/zhanbu/shensha';
import { guaCi, hexMaskFromBinary, yaoCi } from '@/lib/hexagram/oracle-text';
import type {
  LiuyaoLineFacts,
  LiuyaoReadingFacts,
  ReadingTimeFacts,
  XctPalaceFacts,
  XctReadingFacts,
} from './types';

export function timeFacts(time: CastTimeInfo): ReadingTimeFacts {
  return { solar: time.solarText, lunar: time.lunarText, ganzhi: time.ganzhiText };
}

export function buildLiuyaoReadingFacts(
  chart: LiuyaoChart,
  time: CastTimeInfo,
  question = '',
): LiuyaoReadingFacts {
  const lines: LiuyaoLineFacts[] = chart.lines.map((l) => ({
    position: l.position,
    sixGod: l.sixGod,
    relation: l.relation,
    najia: `${l.stem}${l.branch}${l.element}`,
    isYang: l.isYang,
    isMoving: l.isMoving,
    isWorld: l.isWorld,
    isResponse: l.isResponse,
    void: l.isVoid,
    monthBroken: l.isMonthBroken,
    stars: l.stars,
    ...(l.hiddenSpirit
      ? {
          hidden: {
            relation: l.hiddenSpirit.relation,
            najia: `${l.hiddenSpirit.stem}${l.hiddenSpirit.branch}${l.hiddenSpirit.element}`,
          },
        }
      : {}),
    ...(l.changedLine
      ? {
          changed: {
            relation: l.changedLine.relation,
            najia: `${l.changedLine.stem}${l.changedLine.branch}${l.changedLine.element}`,
          },
        }
      : {}),
  }));

  const mask = hexMaskFromBinary(chart.base.binary);
  const changedMask = chart.changed ? hexMaskFromBinary(chart.changed.binary) : null;
  const allMoving = chart.movingLines.length === 6;
  const yongText = allMoving ? yaoCi(mask, 'yong') : null;
  const ss = calcGuShiShenSha(chart.input.dayGz, chart.input.monthBranch);

  return {
    kind: 'liuyao',
    question: question.trim().slice(0, 500),
    time: timeFacts(time),
    base: {
      name: chart.base.name,
      palace: chart.base.palace,
      element: chart.base.palaceElement,
      tags: chart.base.tags,
    },
    changed: chart.changed
      ? {
          name: chart.changed.name,
          palace: chart.changed.palace,
          element: chart.changed.palaceElement,
          tags: chart.changed.tags,
        }
      : null,
    movingLines: chart.movingLines,
    voidBranches: chart.voidBranches as string[],
    monthBody: { branch: chart.monthBody.branch, position: chart.monthBody.position },
    shensha: {
      guiren: ss.guiren,
      lushen: ss.lushen,
      yangren: ss.yangren,
      wenchang: ss.wenchang,
      yima: ss.yima,
      taohua: ss.taohua,
      jiangxing: ss.jiangxing,
      huagai: ss.huagai,
      mouxing: ss.mouxing,
      jiesha: ss.jiesha,
      zaisha: ss.zaisha,
      tianyi: ss.tianyi,
      tianxi: ss.tianxi,
    },
    lines,
    oracle: {
      baseGuaCi: guaCi(mask),
      changedGuaCi: changedMask !== null ? guaCi(changedMask) : null,
      movingLines: chart.movingLines
        .map((pos) => ({ position: pos, text: yaoCi(mask, pos) }))
        .filter((x): x is { position: number; text: string } => Boolean(x.text)),
      yong: yongText ? { title: chart.base.name.startsWith('乾') ? '用九' : '用六', text: yongText } : null,
    },
  };
}

export function buildXctReadingFacts(
  board: BoardState,
  judgments: Record<PalaceNumber, PalaceJudgment>,
  chain: ZhengTuiChain,
  time: CastTimeInfo,
  question = '',
): XctReadingFacts {
  const palaces: XctPalaceFacts[] = [];
  for (let p = 1; p <= 9; p += 1) {
    const j = judgments[p as PalaceNumber];
    palaces.push({
      palace: p,
      palaceName: j.palaceName,
      heaven: j.heaven,
      earth: j.earth,
      hexName: j.hexName,
      mode: j.mode,
      matched: j.matched,
      verdict: j.verdict,
    });
  }
  const name = (pair: { upper: string; lower: string }) =>
    SIXTY_FOUR_HEXAGRAMS[pair.upper as never]?.[pair.lower as never] ?? `${pair.upper}${pair.lower}`;

  return {
    kind: 'xct',
    question: question.trim().slice(0, 500),
    time: timeFacts(time),
    ben: { upper: board.ben.upper, lower: board.ben.lower, name: name(board.ben) },
    zhi: { upper: board.zhi.upper, lower: board.zhi.lower, name: name(board.zhi) },
    center: board.center,
    palaces,
    chain: {
      path: chain.path.map((p) => PALACE_NAMES[p]),
      summary: chain.summary,
      endReason: chain.endReason ?? 'open',
      hasCycle: chain.hasCycle,
    },
  };
}

/**
 * 盘面事实打包（客户端安全，纯函数）。
 *
 * 这些函数产出的对象就是「允许离开浏览器」的全部内容：
 * 卦名、纳甲、六亲、世应、动变、伏神、旬空、神煞、九宫断语、正推链。
 * 不含用神推断、不含 prompt、不含任何环境变量。
 */

import type { LiuyaoChart } from '@/lib/liuyao/najia';
import type { CastTimeInfo } from '@/lib/liuyao/ganzhi';
import type { BoardState, PalaceJudgment, PalaceNumber } from '@/lib/xct/types';
import { ALL_TRIGRAMS, GUA_TO_PALACE, PALACE_NAMES, SIXTY_FOUR_HEXAGRAMS, TRIGRAM_RISING } from '@/lib/xct/constants';
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

export interface XctFactsOptions {
  gender?: '男' | '女';
  marital?: 'married' | 'unmarried' | 'unknown';
  castFrom?: 'coin' | 'four' | 'time' | 'self';
  movingLines?: number[];
  yiBian?: { position: number | null; sum: number; movingCount: number; note: string; zhiSource: 'moving' | 'yibian' } | null;
}

export function buildXctReadingFacts(
  board: BoardState,
  judgments: Record<PalaceNumber, PalaceJudgment>,
  time: CastTimeInfo,
  question = '',
  options: XctFactsOptions = {},
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
      rising: {
        heaven: TRIGRAM_RISING[j.heaven as never] ? '升' : '降',
        earth: TRIGRAM_RISING[j.earth as never] ? '升' : '降',
      },
      mode: j.mode,
      matched: j.matched,
      verdict: j.verdict,
    });
  }

  const name = (pair: { upper: string; lower: string }) =>
    SIXTY_FOUR_HEXAGRAMS[pair.upper as never]?.[pair.lower as never] ?? `${pair.upper}${pair.lower}`;

  // 天盘八卦分布：出现 / 缺席 / 重复（婚占、生育、学历的硬判据）
  const heavenValues = [1, 2, 3, 4, 6, 7, 8, 9].map((p) => board.heaven[p as PalaceNumber]);
  const counts = new Map<string, number>();
  for (const g of heavenValues) counts.set(g, (counts.get(g) ?? 0) + 1);
  const heavenSeen = [...counts.keys()];
  const heavenMissing = ALL_TRIGRAMS.filter((g) => !counts.has(g));
  const heavenDuplicate = [...counts.entries()].filter(([, n]) => n > 1).map(([g]) => g);

  return {
    kind: 'xct',
    question: question.trim().slice(0, 500),
    time: timeFacts(time),
    gender: options.gender ?? '男',
    marital: options.marital ?? 'unknown',
    castFrom: options.castFrom ?? 'four',
    ben: { upper: board.ben.upper, lower: board.ben.lower, name: name(board.ben) },
    zhi: { upper: board.zhi.upper, lower: board.zhi.lower, name: name(board.zhi) },
    center: board.center,
    palaces,
    guaToPalace: Object.fromEntries(ALL_TRIGRAMS.map((g) => [g, GUA_TO_PALACE[g]])),
    heavenSeen,
    heavenMissing,
    heavenDuplicate,
    yiBian: options.yiBian ?? null,
    movingLines: options.movingLines ?? [],
  };
}

import { BoardState, PalaceNumber, PalaceJudgment, FourImagesMode, Trigram } from './types';
import {
  PALACE_TO_GUA,
  PALACE_NAMES,
  TRIGRAM_RISING,
  TRIGRAM_YANG,
  FOUR_IMAGES_VERDICTS,
  SIXTY_FOUR_HEXAGRAMS,
} from './constants';

/**
 * 判定单宫吉凶得失（小成图四象八断核心逻辑）
 */
export function judgePalace(board: BoardState, palace: PalaceNumber): PalaceJudgment {
  const heaven = board.heaven[palace];
  const earth = PALACE_TO_GUA[palace];
  const palaceName = PALACE_NAMES[palace];

  // 1. 中宫特殊处理：归藏之枢，中立立极
  if (palace === 5 || earth === '中') {
    return {
      palace,
      palaceName,
      heaven,
      earth,
      mode: null,
      matched: null,
      verdict: '归藏之枢',
      hexName: '',
      meaning: `中宫归藏得「${heaven}」，为全盘八方气数之总归藏，体现事态整体本质与核心枢纽。`,
    };
  }

  // 2. 归位：天盘卦与本宫地盘卦相同
  // 气归本位、因果气机释放完毕，此处即正推终局，不判吉凶。
  // 若不特判，同卦阴阳必同 → matched 恒为 false，会被硬扣上「悔 / 吝」。
  const earthTrigram = earth as Trigram;
  if (heaven === earthTrigram) {
    return {
      palace,
      palaceName,
      heaven,
      earth,
      mode: null,
      matched: null,
      verdict: '归位',
      hexName: SIXTY_FOUR_HEXAGRAMS[heaven][earthTrigram],
      meaning: `天盘${heaven}临本宫地盘${earth}，卦归本位，为「归位」——事已归元、气机释放完毕，此处即终局，不作吉凶断。`,
    };
  }

  // 3. 地盘八宫正常研判
  const r = TRIGRAM_RISING[heaven];
  const s = TRIGRAM_RISING[earthTrigram];

  // 升降定四象：天降地升为阖，天升地降为辟，天地皆升为往，天地皆降为来
  let mode: FourImagesMode;
  if (!r && s) {
    mode = '阖';
  } else if (r && !s) {
    mode = '辟';
  } else if (r && s) {
    mode = '往';
  } else {
    mode = '来';
  }

  // 阴阳定得配：异性为得配，同性为失配
  const matched = TRIGRAM_YANG[heaven] !== TRIGRAM_YANG[earthTrigram];

  // 四象得配失配断八字（吉、凶、害、利、吝、悔、贞、亨）
  const info = FOUR_IMAGES_VERDICTS[mode];
  const verdict = matched ? info.matched : info.unmatched;

  // 上天下地合成重卦名
  const hexName = SIXTY_FOUR_HEXAGRAMS[heaven][earthTrigram];

  const heavenYangStr = TRIGRAM_YANG[heaven] ? '阳' : '阴';
  const heavenRiseStr = r ? '升' : '降';
  const earthYangStr = TRIGRAM_YANG[earthTrigram] ? '阳' : '阴';
  const earthRiseStr = s ? '升' : '降';
  const matchStr = matched ? '得配' : '失配';

  const meaning = `天盘${heaven}（${heavenYangStr}${heavenRiseStr}）临地盘${earth}（${earthYangStr}${earthRiseStr}），合成【${hexName}】，成「${mode}」式，阴阳${matchStr}，决断为「${verdict}」。${info.note}。`;

  return {
    palace,
    palaceName,
    heaven,
    earth,
    mode,
    matched,
    verdict,
    hexName,
    meaning,
  };
}

/**
 * 全盘九宫一次性判定
 */
export function judgeFullBoard(board: BoardState): Record<PalaceNumber, PalaceJudgment> {
  const result = {} as Record<PalaceNumber, PalaceJudgment>;
  for (let p = 1; p <= 9; p++) {
    result[p as PalaceNumber] = judgePalace(board, p as PalaceNumber);
  }
  return result;
}

import { Trigram, HexagramPair, BoardState, PalaceNumber } from './types';
import { XIAN_TIAN_NUMBER, TRIGRAM_BITS, TIAN_DI_NUMBER_TO_GUA } from './constants';
import { calculateHuGua, guizang, bitsToTrigram } from './guizang';
import { Lunar } from 'lunar-javascript';

/**
 * 依据本卦与之卦（变卦）构建小成图天地盘与中宫立极
 */
export function buildBoard(ben: HexagramPair, zhi: HexagramPair): BoardState {
  // 1. 计算本互与之互
  const benHu = calculateHuGua(ben);
  const zhiHu = calculateHuGua(zhi);

  // 2. 排布八宫天盘
  // 离9: 本上；坎1: 本下；震3: 之上；兑7: 之下；
  // 巽4: 本互上；坤2: 本互下；艮8: 之互上；乾6: 之互下
  const heaven: Record<PalaceNumber, Trigram> = {
    9: ben.upper,
    1: ben.lower,
    3: zhi.upper,
    7: zhi.lower,
    4: benHu.upper,
    2: benHu.lower,
    8: zhiHu.upper,
    6: zhiHu.lower,
    5: '乾', // 先占位，稍后立极填入
  };

  // 3. 中宫立极：四象统摄，大归藏入中
  // 第一步：本之卦连环归藏 mid1 = (本上 ^ 本下) ^ (之上 ^ 之下)
  const gBen = guizang(ben.upper, ben.lower);
  const gZhi = guizang(zhi.upper, zhi.lower);
  const mid1 = guizang(gBen, gZhi);

  // 第二步：本互与之互连环归藏 mid2 = (本互上 ^ 本互下) ^ (之互上 ^ 之互下)
  const gBenHu = guizang(benHu.upper, benHu.lower);
  const gZhiHu = guizang(zhiHu.upper, zhiHu.lower);
  const mid2 = guizang(gBenHu, gZhiHu);

  // 第三步：两枢归藏入中宫 center = mid1 ^ mid2
  const center = guizang(mid1, mid2);
  heaven[5] = center;

  return {
    ben,
    zhi,
    benHu,
    zhiHu,
    heaven,
    center,
    centerSteps: {
      a: ben.upper,
      b: ben.lower,
      mid1,
      mid2,
    },
  };
}

/**
 * 辅助函数：将六爻数字反求上下两经卦
 */
export function sixLinesToHexagram(lines: [number, number, number, number, number, number]): HexagramPair {
  const lowerBits: [number, number, number] = [lines[0], lines[1], lines[2]];
  const upperBits: [number, number, number] = [lines[3], lines[4], lines[5]];
  return {
    lower: bitsToTrigram(lowerBits),
    upper: bitsToTrigram(upperBits),
  };
}

/**
 * 解析用户输入时间（支持 Date 对象或 'YYYY-MM-DDTHH:mm' / 'YYYY-MM-DD HH:mm' 字符串）
 * 确保在本地时区下精确还原年月日时分，避免由于时区转换导致的偏差
 */
export function parseToLocalDate(input: Date | string = new Date()): Date {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date() : input;
  }
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const d = parseInt(match[3], 10);
      const h = match[4] ? parseInt(match[4], 10) : 0;
      const mi = match[5] ? parseInt(match[5], 10) : 0;
      const s = match[6] ? parseInt(match[6], 10) : 0;
      return new Date(y, m, d, h, mi, s);
    }
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

/**
 * 提取起卦时刻详情（公历、农历与四柱干支存证）
 */
export function getDivinationTimeInfo(dateInput: Date | string = new Date()): {
  solarDateStr: string;
  lunarDateStr: string;
  ganzhiStr: string;
  iso: string;
} {
  const date = parseToLocalDate(dateInput);
  const lunar = Lunar.fromDate(date) as any;
  const solarDateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const lunarDateStr = `${lunar.getYearInChinese()}年 农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  const ganzhiStr = `${lunar.getYearInGanZhiExact()}年 ${lunar.getMonthInGanZhiExact()}月 ${lunar.getDayInGanZhiExact()}日 ${lunar.getTimeInGanZhi()}时`;
  return {
    solarDateStr,
    lunarDateStr,
    ganzhiStr,
    iso: date.toISOString(),
  };
}

/**
 * 经典梅花易数时间起卦法：
 * 1. 年支数 (子1..亥12) + 农历月 (1..12) + 农历日 (1..30) 除以 8 取余数（余0作8）为上卦（先天八卦数）。
 * 2. 年支数 + 农历月 + 农历日 + 时支数 (子1..亥12) 除以 8 取余数（余0作8）为下卦（先天八卦数）。
 * 3. 年月日时总和除以 6 取余数（余0作6）为动爻 (1..6)。
 * 4. 动爻发动翻转阴阳生成变卦（之卦）。
 * 5. 依据本卦与变卦构建小成图天地盘与大归藏中宫立极。
 */
export function buildBoardFromMeihuaTime(dateInput: Date | string = new Date()): {
  board: BoardState;
  movingYao: number;
  timeInfo: {
    solarDateStr: string;
    lunarDateStr: string;
    ganzhiStr: string;
    yearZhi: string;
    yearZhiNum: number;
    lunarMonth: number;
    lunarDay: number;
    hourZhi: string;
    hourZhiNum: number;
    upperSum: number;
    lowerSum: number;
    upperRem: number;
    lowerRem: number;
    movingYao: number;
  };
} {
  const date = parseToLocalDate(dateInput);
  const lunar = Lunar.fromDate(date) as any;
  const DIZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const yearZhi = lunar.getYearZhiExact();
  const yearZhiNum = DIZHI_LIST.indexOf(yearZhi) + 1;
  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const hourZhi = lunar.getTimeZhi();
  const hourZhiNum = DIZHI_LIST.indexOf(hourZhi) + 1;

  // 上卦：(年支 + 农历月 + 农历日) % 8
  const upperSum = yearZhiNum + lunarMonth + lunarDay;
  const upperRem = upperSum % 8 === 0 ? 8 : upperSum % 8;
  const benUpper = XIAN_TIAN_NUMBER[upperRem];

  // 下卦：(年支 + 农历月 + 农历日 + 时支) % 8
  const lowerSum = upperSum + hourZhiNum;
  const lowerRem = lowerSum % 8 === 0 ? 8 : lowerSum % 8;
  const benLower = XIAN_TIAN_NUMBER[lowerRem];

  const ben: HexagramPair = { upper: benUpper, lower: benLower };

  // 动爻：(年支 + 农历月 + 农历日 + 时支) % 6
  const movingYao = lowerSum % 6 === 0 ? 6 : lowerSum % 6;

  // 动爻翻转生成变卦
  const lowerBits = TRIGRAM_BITS[benLower];
  const upperBits = TRIGRAM_BITS[benUpper];
  const sixLines = [...lowerBits, ...upperBits] as [number, number, number, number, number, number];
  const changedIdx = movingYao - 1;
  sixLines[changedIdx] = sixLines[changedIdx] === 1 ? 0 : 1;

  const zhi = sixLinesToHexagram(sixLines);
  const board = buildBoard(ben, zhi);

  const solarDateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const lunarDateStr = `${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  const ganzhiStr = `${lunar.getYearInGanZhiExact()}年 ${lunar.getMonthInGanZhiExact()}月 ${lunar.getDayInGanZhiExact()}日 ${lunar.getTimeInGanZhi()}时`;

  return {
    board,
    movingYao,
    timeInfo: {
      solarDateStr,
      lunarDateStr,
      ganzhiStr,
      yearZhi,
      yearZhiNum,
      lunarMonth,
      lunarDay,
      hourZhi,
      hourZhiNum,
      upperSum,
      lowerSum,
      upperRem,
      lowerRem,
      movingYao,
    },
  };
}

/**
 * 天地数起卦（四数）：原 App 'four' 模式（小成图独门起卦法，小事首选）
 * 随口报 4 数（各取 0 至 9）。
 * 前两数相重为本卦（上、下），后两数相重为之卦（上、下）。
 * 直接成卦，不需动爻。
 */
export function buildBoardFromTianDiNumbers(
  nums: [number, number, number, number]
): BoardState {
  const mapped = nums.map((n) => {
    const val = ((n % 10) + 10) % 10;
    return TIAN_DI_NUMBER_TO_GUA[val] || '坤';
  });

  const ben: HexagramPair = { upper: mapped[0], lower: mapped[1] };
  const zhi: HexagramPair = { upper: mapped[2], lower: mapped[3] };

  return buildBoard(ben, zhi);
}

/**
 * 自定选卦（点选八卦）：原 App 'self' 模式
 */
export function buildBoardFromManualTrigrams(
  benUpper: Trigram,
  benLower: Trigram,
  zhiUpper: Trigram,
  zhiLower: Trigram
): BoardState {
  return buildBoard({ upper: benUpper, lower: benLower }, { upper: zhiUpper, lower: zhiLower });
}

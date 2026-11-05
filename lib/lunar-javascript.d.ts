// Minimal ambient type declarations for lunar-javascript (no official .d.ts shipped)

declare module 'lunar-javascript' {
  export interface Solar {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    toYmd(): string;
    toYmdHms(): string;
    getLunar(): Lunar;
    getJieQiTable(): Record<string, Solar>;
    nextYear(n: number): Solar;
    nextMonth(n: number): Solar;
    next(n: number): Solar;
    nextHour(n: number): Solar;
    toString(): string;
  }

  export interface Lunar {
    getSolar(): Solar;
    getEightChar(): EightChar;
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhiExact(): string;
    getTimeInGanZhi(): string;
    /** 年名（二〇二六…） */
    getYearInChinese(): string;
    /** 农历年支（子/丑/…） */
    getYearZhiExact(): string;
    /** 时辰地支（子/丑/…） */
    getTimeZhi(): string;
    /** 农历月名（正月/二月…，闰月返回不带「闰」的原名，需自行加前缀） */
    getMonthInChinese(): string;
    /** 农历日名（初一/十五/廿一…） */
    getDayInChinese(): string;
    getYearShengXiao(): string;
    getJieQiTable(): Record<string, Solar>;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    toString(): string;
    toFullString(): string;
  }

  export interface LiuNian {
    getYear(): number;
    getAge(): number;
    getIndex(): number;
    getGanZhi(): string;
    getXun(): string;
    getXunKong(): string;
    getLiuYue(): unknown[];
    getLunar(): Lunar;
  }

  export interface DaYun {
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
    getIndex(): number;
    getGanZhi(): string;
    getXun(): string;
    getXunKong(): string;
    getLiuNian(n?: number): LiuNian[];
    getXiaoYun(n?: number): unknown[];
    getLunar(): Lunar;
  }

  export interface Yun {
    getGender(): number;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    isForward(): boolean;
    getStartSolar(): Solar;
    getDaYun(n?: number): DaYun[];
    getLunar(): Lunar;
  }

  export interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYearHideGan(): string[];
    getMonthHideGan(): string[];
    getDayHideGan(): string[];
    getTimeHideGan(): string[];
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    getYearWuXing(): string;
    getMonthWuXing(): string;
    getDayWuXing(): string;
    getTimeWuXing(): string;
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYearDiShi(): string;
    getMonthDiShi(): string;
    getDayDiShi(): string;
    getTimeDiShi(): string;
    getTaiYuan(): string;
    getTaiYuanNaYin(): string;
    getMingGong(): string;
    getMingGongNaYin(): string;
    getShenGong(): string;
    getShenGongNaYin(): string;
    getYun(gender: number, sect?: number): Yun;
    setSect(sect: number): void;
    getSect(): number;
    toString(): string;
  }

  export interface SolarStatic {
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Solar;
    fromYmd(y: number, m: number, d: number): Solar;
    fromDate(date: Date): Solar;
  }

  export interface LunarStatic {
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): Lunar;
    fromYmd(y: number, m: number, d: number): Lunar;
    fromDate(date: Date): Lunar;
  }

  export const Solar: SolarStatic;
  export const Lunar: LunarStatic;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const LunarUtil: any;
}

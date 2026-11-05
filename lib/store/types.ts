/**
 * 卦例存储契约
 * ==============
 * 现在只有浏览器本地实现（localStorage）；接口从第一天就是异步的，
 * 将来接 Cloudflare D1 时换实现即可，调用方不用改。
 *
 * 设计取舍：
 *   1. 只存「起卦输入」不存盘面结果 —— 盘面由确定性引擎重算，引擎修 bug 后旧记录跟着修正；
 *   2. 存一份 summary 快照，仅用于列表展示（卦名/变卦/标签），不参与重算；
 *   3. 记录带 schema 版本，读取时逐版迁移，绝不因字段变化丢历史。
 */

export type CaseKind = 'liuyao' | 'xct';

export type LiuyaoMethod = 'coin' | 'yarrow' | 'manual';
export type XctMethod = 'four' | 'time' | 'self';

export interface LiuyaoCaseInput {
  kind: 'liuyao';
  method: LiuyaoMethod;
  /** 六次投掷 6/7/8/9，初爻→上爻 */
  coins: number[];
  question: string;
  gender: '男' | '女';
}

export interface XctManual {
  benUpper: string;
  benLower: string;
  zhiUpper: string;
  zhiLower: string;
}

export interface XctCaseInput {
  kind: 'xct';
  method: XctMethod;
  tianDiNums?: [string, string, string, string];
  timeDate?: string;
  manual?: XctManual;
}

export type CaseInput = LiuyaoCaseInput | XctCaseInput;

/** 列表展示用快照（不作为事实来源） */
export interface CaseSummary {
  /** 本卦 / 本图 */
  primary: string;
  /** 变卦（六爻）或 中宫归藏（小成图） */
  changed?: string | null;
  /** 结构标签：六冲/归魂/… */
  tags?: string[];
}

export interface CaseRecord {
  id: string;
  schema: 1;
  kind: CaseKind;
  /** 保存时刻 ISO */
  createdAt: string;
  /** 起卦时刻，datetime-local 形态（YYYY-MM-DDTHH:mm） */
  timeInput: string;
  question: string;
  gender?: '男' | '女';
  input: CaseInput;
  summary: CaseSummary;
  favorite?: boolean;
}

export interface CaseStore {
  list(): Promise<CaseRecord[]>;
  get(id: string): Promise<CaseRecord | null>;
  save(record: CaseRecord): Promise<void>;
  remove(id: string): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
}

/** 本地存储最小面（便于测试传入内存实现） */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const CASE_STORAGE_KEY = 'liuyao.cases.v1';
export const CASE_SCHEMA_VERSION = 1 as const;
export const MAX_CASES = 200;

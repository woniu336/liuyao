/**
 * 解卦边界契约（客户端只发事实，服务端拿 key 调模型）
 * ====================================================
 * 铁律：
 *   1. 客户端只上传「盘面事实 + 问句」，不上传任何密钥、prompt 模板或推理过程；
 *   2. prompt 由服务端拼装（app/api/read/prompt.ts），不随客户端 bundle 下发；
 *   3. 事实层只描述排盘结果，不含用神取舍与吉凶结论——那属于解读层。
 *
 * 现在只落地契约与 /api/read 通道，暂时没有前端入口：
 * 断卦口径（宗法用神、吉凶表达、应期）是产品决策，定了再接 UI。
 */

export interface ReadingTimeFacts {
  /** 公历（如 2026年11月5日 12:02） */
  solar: string;
  /** 农历（如 二〇二六年 农历九月廿七） */
  lunar: string;
  /** 四柱（如 丙午年 戊申月 己丑日 庚午时） */
  ganzhi: string;
}

export interface LiuyaoLineFacts {
  position: number;
  sixGod: string;
  relation: string;
  /** 纳甲「干支部位」：如 辛丑土 */
  najia: string;
  isYang: boolean;
  isMoving: boolean;
  isWorld: boolean;
  isResponse: boolean;
  void: boolean;
  monthBroken: boolean;
  stars: string[];
  hidden?: { relation: string; najia: string };
  changed?: { relation: string; najia: string };
}

export interface LiuyaoReadingFacts {
  kind: 'liuyao';
  question: string;
  time: ReadingTimeFacts;
  base: { name: string; palace: string; element: string; tags: string[] };
  changed: { name: string; palace: string; element: string; tags: string[] } | null;
  movingLines: number[];
  voidBranches: string[];
  monthBody: { branch: string; position: number };
  /** 十三实用星煞（与盘面同一套算法） */
  shensha: {
    guiren: string;
    lushen: string;
    yangren: string;
    wenchang: string;
    yima: string;
    taohua: string;
    jiangxing: string;
    huagai: string;
    mouxing: string;
    jiesha: string;
    zaisha: string;
    tianyi: string;
    tianxi: string;
  };
  lines: LiuyaoLineFacts[];
  /** 经文层：只给卦辞与动爻爻辞（不含翻译/注家） */
  oracle: {
    baseGuaCi: string | null;
    changedGuaCi: string | null;
    movingLines: { position: number; text: string }[];
    /** 六爻全动且为乾/坤时的用九/用六 */
    yong: { title: string; text: string } | null;
  };
}

export interface XctPalaceFacts {
  palace: number;
  palaceName: string;
  heaven: string;
  earth: string;
  hexName: string;
  mode: string | null;
  matched: boolean | null;
  verdict: string;
}

export interface XctReadingFacts {
  kind: 'xct';
  question: string;
  time: ReadingTimeFacts;
  ben: { upper: string; lower: string; name: string };
  zhi: { upper: string; lower: string; name: string };
  center: string;
  palaces: XctPalaceFacts[];
  chain: { path: string[]; summary: string; endReason: string; hasCycle: boolean };
}

export type ReadingFacts = LiuyaoReadingFacts | XctReadingFacts;

export interface ReadingRequestBody {
  facts: ReadingFacts;
}

/** 服务端 → 客户端的流式事件（ndjson 行，前缀 data: ） */
export interface ReadingStreamEvent {
  content?: string;
  error?: string;
  done?: boolean;
}
